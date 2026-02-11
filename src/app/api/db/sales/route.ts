import { auth } from '@/lib/auth/auth';
import {
  createSale,
  deleteSale,
  getSaleById,
  getSalesBySeller,
  getSalesBySellerAndStatus,
  getSalesByStatus,
  getSalesByTenant,
  getSalesCountByStatus,
  getSalesCountByStatusForSeller,
  updateSale,
} from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';
import type { Sale as SaleDB } from '@/types/db';
import type { Installment, InstallmentStatus, Sale, SaleConsistencyStatus } from '@/types';

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.userId;
    const userRole = session.user.role;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status') as SaleConsistencyStatus | null;
    const sellerId = searchParams.get('sellerId');
    const countsOnly = searchParams.get('counts') === 'true';
    const isValidator = userRole === 'ADMIN' || userRole === 'MANAGER';

    if (countsOnly) {
      const counts = isValidator
        ? getSalesCountByStatus(session.user.tenantId)
        : getSalesCountByStatusForSeller(session.user.tenantId, userId);
      return NextResponse.json(counts);
    }

    if (id) {
      const saleDB = getSaleById(id);
      if (!saleDB || saleDB.tenant_id !== session.user.tenantId) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      if (!isValidator && saleDB.seller_id !== userId) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      return NextResponse.json(transformSaleToComponent(saleDB));
    }

    let salesDB: SaleDB[] = [];

    if (status) {
      if (isValidator) {
        salesDB = getSalesByStatus(session.user.tenantId, status);
      } else {
        salesDB = getSalesBySellerAndStatus(session.user.tenantId, userId, status);
      }
      return NextResponse.json(salesDB.map(transformSaleToComponent));
    }

    if (sellerId) {
      if (!isValidator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      salesDB = getSalesBySeller(session.user.tenantId, sellerId);
      return NextResponse.json(salesDB.map(transformSaleToComponent));
    }

    if (isValidator) {
      salesDB = getSalesByTenant(session.user.tenantId);
    } else {
      salesDB = getSalesBySeller(session.user.tenantId, userId);
    }

    return NextResponse.json(salesDB.map(transformSaleToComponent));
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.userId;
    const userRole = session.user.role;

    const canCreate = ['ADMIN', 'MANAGER', 'SALES_REP'].includes(userRole);
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const customerName = String(data.customerName || '').trim();
    const totalValue = Number(data.totalValue);

    if (!customerName || !Number.isFinite(totalValue)) {
      return NextResponse.json({ error: 'customerName and totalValue are required' }, { status: 400 });
    }

    // Resolve seller details from DB (JWT payload does not include name/pdv)
    const { getUserById } = await import('@/lib/db/operations');
    const sellerUser = getUserById(userId);
    if (!sellerUser || sellerUser.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sale = createSale(
      session.user.tenantId,
      customerName,
      userId,
      sellerUser.name,
      totalValue,
      {
        dealId: data.dealId ?? null,
        customerId: data.customerId ?? null,
        pdvId: data.pdvId ?? sellerUser.pdv_id ?? null,
        productId: data.productId ?? null,
        productName: data.productName ?? null,
        creditValue: data.creditValue,
        planMonths: data.planMonths ?? null,
        notes: data.notes,
        installment1: data.installment1,
        installment2: data.installment2,
        installment3: data.installment3,
        installment4: data.installment4,
      }
    );

    return NextResponse.json(transformSaleToComponent(sale), { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.userId;
    const userRole = session.user.role;

    if (userRole === 'SUPPORT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const id = String(data.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getSaleById(id);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const isValidator = userRole === 'ADMIN' || userRole === 'MANAGER';
    const isOwner = existing.seller_id === userId;
    if (!isValidator && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existing.consistency_status === 'CONSISTENT') {
      return NextResponse.json({ error: 'Cannot edit a validated sale' }, { status: 400 });
    }

    const installments = Array.isArray(data.installments) ? data.installments : null;
    const installmentByNumber = (n: 1 | 2 | 3 | 4) => {
      const fromArray = installments?.find((i: any) => Number(i.number) === n);
      return fromArray
        ? { dueDate: fromArray.dueDate, value: fromArray.value }
        : (data[`installment${n}`] ?? undefined);
    };

    const updated = updateSale(id, {
      customerName: data.customerName ?? data.customer_name,
      customerId: data.customerId ?? data.customer_id,
      pdvId: data.pdvId ?? data.pdv_id,
      productId: data.productId ?? data.product_id,
      productName: data.productName ?? data.product_name,
      totalValue: data.totalValue ?? data.total_value,
      creditValue: data.creditValue ?? data.credit_value,
      planMonths: data.planMonths ?? data.plan_months,
      notes: data.notes,
      installment1: installmentByNumber(1),
      installment2: installmentByNumber(2),
      installment3: installmentByNumber(3),
      installment4: installmentByNumber(4),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json(transformSaleToComponent(updated));
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getSaleById(id);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    deleteSale(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
