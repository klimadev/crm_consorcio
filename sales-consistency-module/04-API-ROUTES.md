# Step 04 — API Routes

## Overview

Create three new API route files following the existing `/api/db/` pattern (which uses `auth()` from `@/lib/auth/auth`):

1. **`/api/db/sales/route.ts`** — CRUD for sales (GET list, POST create, PUT update, DELETE)
2. **`/api/db/sales/validate/route.ts`** — POST to toggle consistency status
3. **`/api/db/sales/installments/route.ts`** — PUT to update individual installment status

---

## 1. Main Sales Route

### Location: `src/app/api/db/sales/route.ts`

```typescript
import { auth } from '@/lib/auth/auth';
import {
  getSalesByTenant, getSalesByStatus, getSalesBySeller,
  createSale, updateSale, deleteSale, getSaleById, getSalesCountByStatus
} from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';
import type { Sale as SaleDB } from '@/types/db';
import type { Sale, Installment, InstallmentStatus } from '@/types';

function transformSaleToComponent(sale: SaleDB): Sale {
  const installments: Installment[] = [1, 2, 3, 4].map((n) => ({
    number: n as 1 | 2 | 3 | 4,
    status: sale[`installment_${n}_status` as keyof SaleDB] as InstallmentStatus || 'PENDING',
    dueDate: sale[`installment_${n}_due_date` as keyof SaleDB] as string | null,
    receivedDate: sale[`installment_${n}_received_date` as keyof SaleDB] as string | null,
    value: sale[`installment_${n}_value` as keyof SaleDB] as number || 0,
  }));

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

// GET — List sales with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sellerId = searchParams.get('sellerId');
    const countsOnly = searchParams.get('counts') === 'true';

    // Return just counts per status (for badge counts)
    if (countsOnly) {
      const counts = getSalesCountByStatus(session.user.tenantId);
      return NextResponse.json(counts);
    }

    let salesDB;
    if (status) {
      salesDB = getSalesByStatus(session.user.tenantId, status as any);
    } else if (sellerId) {
      salesDB = getSalesBySeller(session.user.tenantId, sellerId);
    } else {
      // For SALES_REP, only show their own sales
      if (session.user.role === 'SALES_REP') {
        salesDB = getSalesBySeller(session.user.tenantId, session.user.id);
      } else {
        salesDB = getSalesByTenant(session.user.tenantId);
      }
    }

    return NextResponse.json(salesDB.map(transformSaleToComponent));
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create new sale (SALES_REP, MANAGER, ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = ['ADMIN', 'MANAGER', 'SALES_REP'].includes(session.user.role);
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    if (!data.customerName || !data.totalValue) {
      return NextResponse.json(
        { error: 'customerName and totalValue are required' },
        { status: 400 }
      );
    }

    const sale = createSale(
      session.user.tenantId,
      data.customerName,
      session.user.id,        // seller = current user
      session.user.name,      // seller name
      data.totalValue,
      {
        dealId: data.dealId,
        customerId: data.customerId,
        pdvId: data.pdvId || session.user.pdvId,
        productId: data.productId,
        productName: data.productName,
        creditValue: data.creditValue,
        planMonths: data.planMonths,
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

// PUT — Update sale details (only if AWAITING_CONSISTENCY or INCONSISTENT)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getSaleById(data.id);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Only allow edits if not yet validated as CONSISTENT
    if (existing.consistency_status === 'CONSISTENT') {
      return NextResponse.json(
        { error: 'Cannot edit a validated sale' },
        { status: 400 }
      );
    }

    // Re-submit sets status back to AWAITING
    const sale = updateSale(data.id, {
      ...data,
    });

    return NextResponse.json(sale ? transformSaleToComponent(sale) : null);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Remove sale (ADMIN/MANAGER only)
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
```

---

## 2. Validation Route

### Location: `src/app/api/db/sales/validate/route.ts`

```typescript
import { auth } from '@/lib/auth/auth';
import { validateSale, getSaleById } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';

// POST — Validate a sale (ADMIN/MANAGER only)
// Body: { saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes?: string }
export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only managers can validate sales' }, { status: 403 });
    }

    const { saleId, status, notes } = await request.json();

    if (!saleId || !['CONSISTENT', 'INCONSISTENT'].includes(status)) {
      return NextResponse.json(
        { error: 'saleId and valid status (CONSISTENT/INCONSISTENT) are required' },
        { status: 400 }
      );
    }

    const existing = getSaleById(saleId);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = validateSale(saleId, session.user.id, status, notes || '');
    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error('Error validating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 3. Installment Route

### Location: `src/app/api/db/sales/installments/route.ts`

```typescript
import { auth } from '@/lib/auth/auth';
import { updateInstallmentStatus, getSaleById } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';

// PUT — Update installment status (ADMIN/MANAGER only)
// Body: { saleId: string, installmentNumber: 1|2|3|4, status: string, receivedDate?: string }
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

    if (!saleId || ![1, 2, 3, 4].includes(installmentNumber) || !['PENDING', 'RECEIVED', 'OVERDUE'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const existing = getSaleById(saleId);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Only allow installment updates on CONSISTENT sales
    if (existing.consistency_status !== 'CONSISTENT') {
      return NextResponse.json(
        { error: 'Can only track installments on validated (CONSISTENT) sales' },
        { status: 400 }
      );
    }

    const sale = updateInstallmentStatus(
      saleId,
      installmentNumber,
      status,
      status === 'RECEIVED' ? (receivedDate || new Date().toISOString()) : null
    );

    return NextResponse.json({ success: true, sale });
  } catch (error) {
    console.error('Error updating installment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## API Endpoint Summary

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET` | `/api/db/sales` | List sales (filterable) | ALL roles (SALES_REP sees only own) |
| `GET` | `/api/db/sales?status=AWAITING_CONSISTENCY` | Filter by status | ADMIN/MANAGER |
| `GET` | `/api/db/sales?counts=true` | Get status counts | ADMIN/MANAGER |
| `POST` | `/api/db/sales` | Create new sale | ADMIN/MANAGER/SALES_REP |
| `PUT` | `/api/db/sales` | Update sale details | Owner / ADMIN/MANAGER |
| `DELETE` | `/api/db/sales?id=xxx` | Delete sale | ADMIN/MANAGER |
| `POST` | `/api/db/sales/validate` | Mark CONSISTENT/INCONSISTENT | ADMIN/MANAGER |
| `PUT` | `/api/db/sales/installments` | Update installment status | ADMIN/MANAGER |
