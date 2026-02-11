# Step 03 — Backend Database Operations

## Overview

Add new functions to `src/lib/db/operations.ts` for sale CRUD, validation, and installment management. Follow the existing pattern: raw SQL via `runQuery`, `getQuery`, `getOneQuery`, `generateId`.

---

## Functions to Add

### 1. `createSale()`

```typescript
export function createSale(
  tenantId: string,
  customerName: string,
  sellerId: string,
  sellerName: string,
  totalValue: number,
  data: {
    dealId?: string | null;
    customerId?: string | null;
    pdvId?: string | null;
    productId?: string | null;
    productName?: string | null;
    creditValue?: number;
    planMonths?: number | null;
    notes?: string;
    installment1?: { dueDate?: string; value?: number };
    installment2?: { dueDate?: string; value?: number };
    installment3?: { dueDate?: string; value?: number };
    installment4?: { dueDate?: string; value?: number };
  } = {}
): Sale {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(`
    INSERT INTO sales (
      id, tenant_id, deal_id, customer_id, customer_name,
      seller_id, seller_name, pdv_id, product_id, product_name,
      total_value, credit_value, plan_months,
      consistency_status,
      installment_1_due_date, installment_1_value,
      installment_2_due_date, installment_2_value,
      installment_3_due_date, installment_3_value,
      installment_4_due_date, installment_4_value,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId,
    data.dealId || null, data.customerId || null, customerName,
    sellerId, sellerName,
    data.pdvId || null, data.productId || null, data.productName || null,
    totalValue, data.creditValue || 0, data.planMonths || null,
    'AWAITING_CONSISTENCY',
    data.installment1?.dueDate || null, data.installment1?.value || 0,
    data.installment2?.dueDate || null, data.installment2?.value || 0,
    data.installment3?.dueDate || null, data.installment3?.value || 0,
    data.installment4?.dueDate || null, data.installment4?.value || 0,
    data.notes || null, now, now
  ]);

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id])!;
}
```

### 2. `getSalesByTenant()`

```typescript
export function getSalesByTenant(tenantId: string): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC',
    [tenantId]
  );
}
```

### 3. `getSalesByStatus()`

```typescript
export function getSalesByStatus(
  tenantId: string,
  status: 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT'
): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? AND consistency_status = ? ORDER BY created_at DESC',
    [tenantId, status]
  );
}
```

### 4. `getSalesBySeller()`

```typescript
export function getSalesBySeller(tenantId: string, sellerId: string): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? AND seller_id = ? ORDER BY created_at DESC',
    [tenantId, sellerId]
  );
}
```

### 5. `getSaleById()`

```typescript
export function getSaleById(id: string): Sale | null {
  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}
```

### 6. `validateSale()` — Core State Transition

```typescript
export function validateSale(
  id: string,
  validatorId: string,
  status: 'CONSISTENT' | 'INCONSISTENT',
  notes: string = ''
): Sale | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE sales 
    SET consistency_status = ?, 
        validated_by = ?, 
        validated_at = ?, 
        validation_notes = ?,
        updated_at = ?
    WHERE id = ?
  `, [status, validatorId, now, notes, now, id]);

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}
```

### 7. `updateInstallmentStatus()`

```typescript
export function updateInstallmentStatus(
  saleId: string,
  installmentNumber: 1 | 2 | 3 | 4,
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE',
  receivedDate?: string | null
): Sale | null {
  const now = new Date().toISOString();
  const statusCol = `installment_${installmentNumber}_status`;
  const receivedCol = `installment_${installmentNumber}_received_date`;

  runQuery(`
    UPDATE sales 
    SET ${statusCol} = ?, 
        ${receivedCol} = ?,
        updated_at = ?
    WHERE id = ?
  `, [status, receivedDate || null, now, saleId]);

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [saleId]);
}
```

### 8. `updateSale()`

```typescript
export function updateSale(
  id: string,
  data: {
    customerName?: string;
    customerId?: string | null;
    pdvId?: string | null;
    productId?: string | null;
    productName?: string | null;
    totalValue?: number;
    creditValue?: number;
    planMonths?: number | null;
    notes?: string | null;
    installment1?: { dueDate?: string; value?: number };
    installment2?: { dueDate?: string; value?: number };
    installment3?: { dueDate?: string; value?: number };
    installment4?: { dueDate?: string; value?: number };
  }
): Sale | null {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  // Build dynamic SET clause for provided fields
  if (data.customerName !== undefined) { sets.push('customer_name = ?'); params.push(data.customerName); }
  if (data.customerId !== undefined) { sets.push('customer_id = ?'); params.push(data.customerId); }
  if (data.pdvId !== undefined) { sets.push('pdv_id = ?'); params.push(data.pdvId); }
  if (data.productId !== undefined) { sets.push('product_id = ?'); params.push(data.productId); }
  if (data.productName !== undefined) { sets.push('product_name = ?'); params.push(data.productName); }
  if (data.totalValue !== undefined) { sets.push('total_value = ?'); params.push(data.totalValue); }
  if (data.creditValue !== undefined) { sets.push('credit_value = ?'); params.push(data.creditValue); }
  if (data.planMonths !== undefined) { sets.push('plan_months = ?'); params.push(data.planMonths); }
  if (data.notes !== undefined) { sets.push('notes = ?'); params.push(data.notes); }

  // Installment updates
  for (const n of [1, 2, 3, 4] as const) {
    const inst = data[`installment${n}` as keyof typeof data] as { dueDate?: string; value?: number } | undefined;
    if (inst) {
      if (inst.dueDate !== undefined) { sets.push(`installment_${n}_due_date = ?`); params.push(inst.dueDate); }
      if (inst.value !== undefined) { sets.push(`installment_${n}_value = ?`); params.push(inst.value); }
    }
  }

  params.push(id);
  runQuery(`UPDATE sales SET ${sets.join(', ')} WHERE id = ?`, params);

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}
```

### 9. `deleteSale()`

```typescript
export function deleteSale(id: string): void {
  runQuery('DELETE FROM sales WHERE id = ?', [id]);
}
```

### 10. `getSalesCountByStatus()`

```typescript
export function getSalesCountByStatus(tenantId: string): Record<string, number> {
  const rows = getQuery<{ consistency_status: string; count: number }>(
    `SELECT consistency_status, COUNT(*) as count 
     FROM sales WHERE tenant_id = ? 
     GROUP BY consistency_status`,
    [tenantId]
  );
  const result: Record<string, number> = {
    AWAITING_CONSISTENCY: 0,
    CONSISTENT: 0,
    INCONSISTENT: 0,
  };
  for (const row of rows) {
    result[row.consistency_status] = row.count;
  }
  return result;
}
```

---

## Export Updates

Add all new functions to the exports of `src/lib/db/operations.ts`. Also re-export from `src/lib/db/index.ts` if needed (check existing barrel export pattern).

---

## Important Notes

- All functions follow the existing pattern of returning the DB-layer `Sale` type (snake_case). The transformation to frontend camelCase happens in the API route layer.
- The `validateSale()` function is the **core state machine transition** — it's the only way to change `consistency_status`.
- Dynamic column interpolation in `updateInstallmentStatus()` is safe because `installmentNumber` is typed as `1 | 2 | 3 | 4` (no SQL injection risk).
