import { auth } from '@/lib/auth/auth';
import { getSaleById, validateSale } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';
import type { Sale as SaleDB } from '@/types/db';
import type { Installment, InstallmentStatus, Sale } from '@/types';

function transformSaleToComponent(sale: SaleDB): Sale {
  const installments: Installment[] = ([1, 2, 3, 4] as const).map((n) => {
    const statusKey = `installment_${n}_status` as const;
    const dueKey = `installment_${n}_due_date` as const;
    const receivedKey = `installment_${n}_received_date` as const;
    const valueKey = `installment_${n}_value` as const;

    return {
      number: n,
      status: (sale[statusKey] as InstallmentStatus) || 'PENDING',
      dueDate: (sale[dueKey] as string | null) ?? null,
      receivedDate: (sale[receivedKey] as string | null) ?? null,
      value: Number((sale[valueKey] as number | null) ?? 0) || 0,
    };
  });

  return {
    id: sale.id,
    dealId: sale.deal_id,
    customerId: sale.customer_id,
    customerName: sale.customer_name,
    sellerId: sale.seller_id,
    sellerName: sale.seller_name,
    pdvId: sale.pdv_id,
    productId: sale.product_id,
    productName: sale.product_name,
    totalValue: sale.total_value,
    creditValue: sale.credit_value,
    planMonths: sale.plan_months,
    consistencyStatus: sale.consistency_status,
    validatedBy: sale.validated_by,
    validatedAt: sale.validated_at,
    validationNotes: sale.validation_notes,
    installments,
    notes: sale.notes,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { saleId, status, notes } = await request.json();
    if (!saleId || !['CONSISTENT', 'INCONSISTENT'].includes(status)) {
      return NextResponse.json(
        { error: 'saleId and valid status (CONSISTENT/INCONSISTENT) are required' },
        { status: 400 }
      );
    }

    if (status === 'INCONSISTENT' && String(notes || '').trim().length === 0) {
      return NextResponse.json({ error: 'notes are required when marking as INCONSISTENT' }, { status: 400 });
    }

    const existing = getSaleById(String(saleId));
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (existing.consistency_status === 'CONSISTENT' && status === 'INCONSISTENT') {
      const hasReceived =
        existing.installment_1_status === 'RECEIVED' ||
        existing.installment_2_status === 'RECEIVED' ||
        existing.installment_3_status === 'RECEIVED' ||
        existing.installment_4_status === 'RECEIVED';
      if (hasReceived) {
        return NextResponse.json(
          { error: 'Cannot mark a sale as INCONSISTENT after installments are received' },
          { status: 400 }
        );
      }
    }

    const saleDB = validateSale(String(saleId), session.user.userId, status, String(notes || ''));
    if (!saleDB) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale: transformSaleToComponent(saleDB) });
  } catch (error) {
    console.error('Error validating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
