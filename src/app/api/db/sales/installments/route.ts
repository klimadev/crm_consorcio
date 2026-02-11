import { auth } from '@/lib/auth/auth';
import { getSaleById, updateInstallmentStatus } from '@/lib/db/operations';
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

export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { saleId, installmentNumber, status, receivedDate } = await request.json();
    const instNumber = Number(installmentNumber);
    const normalizedStatus = String(status);

    if (!saleId || ![1, 2, 3, 4].includes(instNumber) || !['PENDING', 'RECEIVED', 'OVERDUE'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const existing = getSaleById(String(saleId));
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (existing.consistency_status !== 'CONSISTENT') {
      return NextResponse.json(
        { error: 'Can only track installments on validated (CONSISTENT) sales' },
        { status: 400 }
      );
    }

    const nextReceivedDate =
      normalizedStatus === 'RECEIVED'
        ? (receivedDate ? String(receivedDate) : new Date().toISOString())
        : null;

    const saleDB = updateInstallmentStatus(
      String(saleId),
      instNumber as 1 | 2 | 3 | 4,
      normalizedStatus as 'PENDING' | 'RECEIVED' | 'OVERDUE',
      nextReceivedDate
    );

    if (!saleDB) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale: transformSaleToComponent(saleDB) });
  } catch (error) {
    console.error('Error updating installment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
