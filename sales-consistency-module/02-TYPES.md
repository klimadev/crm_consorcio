# Step 02 — TypeScript Type Definitions

## Overview

Add type definitions at both layers: the DB layer (snake_case, in `src/types/db/index.ts`) and the frontend layer (camelCase, in `src/types/index.ts`).

---

## DB Types — `src/types/db/index.ts`

Add at the end of the file:

```typescript
export interface Sale {
  id: string;
  tenant_id: string;
  
  // Core data
  deal_id: string | null;
  customer_id: string | null;
  customer_name: string;
  seller_id: string;
  seller_name: string;
  pdv_id: string | null;
  product_id: string | null;
  product_name: string | null;
  
  // Financial
  total_value: number;
  credit_value: number;
  plan_months: number | null;
  
  // Consistency validation
  consistency_status: 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT';
  validated_by: string | null;
  validated_at: string | null;
  validation_notes: string | null;
  
  // Installment 1
  installment_1_status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  installment_1_due_date: string | null;
  installment_1_received_date: string | null;
  installment_1_value: number;
  
  // Installment 2
  installment_2_status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  installment_2_due_date: string | null;
  installment_2_received_date: string | null;
  installment_2_value: number;
  
  // Installment 3
  installment_3_status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  installment_3_due_date: string | null;
  installment_3_received_date: string | null;
  installment_3_value: number;
  
  // Installment 4
  installment_4_status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  installment_4_due_date: string | null;
  installment_4_received_date: string | null;
  installment_4_value: number;
  
  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

Also update the re-export in `src/lib/db/schema.ts`:

```typescript
export type {
  Tenant, User, PDV, Customer, Product, PipelineStage,
  Tag, Deal, Integration, CustomFieldDefinition, DashboardWidget,
  Sale  // ← ADD THIS
} from '@/types/db';
```

---

## Frontend Types — `src/types/index.ts`

Add at the end of the file:

```typescript
// ─── Sale Consistency Types ─────────────────────────────────────

export type SaleConsistencyStatus = 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT';

export const SALE_CONSISTENCY_STATUS_LABELS: Record<SaleConsistencyStatus, string> = {
  AWAITING_CONSISTENCY: 'Aguardando Consistência',
  CONSISTENT: 'Consistente',
  INCONSISTENT: 'Inconsistente',
};

export const SALE_CONSISTENCY_STATUS_COLORS: Record<SaleConsistencyStatus, string> = {
  AWAITING_CONSISTENCY: 'bg-amber-100 text-amber-700',
  CONSISTENT: 'bg-emerald-100 text-emerald-700',
  INCONSISTENT: 'bg-red-100 text-red-700',
};

export type InstallmentStatus = 'PENDING' | 'RECEIVED' | 'OVERDUE';

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  OVERDUE: 'Atrasada',
};

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  RECEIVED: 'bg-green-100 text-green-600',
  OVERDUE: 'bg-red-100 text-red-600',
};

export interface Installment {
  number: 1 | 2 | 3 | 4;
  status: InstallmentStatus;
  dueDate: string | null;
  receivedDate: string | null;
  value: number;
}

export interface Sale {
  id: Id;
  dealId: Id | null;
  customerId: Id | null;
  customerName: string;
  sellerId: Id;
  sellerName: string;
  pdvId: Id | null;
  productId: Id | null;
  productName: string | null;
  totalValue: number;
  creditValue: number;
  planMonths: number | null;
  consistencyStatus: SaleConsistencyStatus;
  validatedBy: Id | null;
  validatedAt: string | null;
  validationNotes: string | null;
  installments: Installment[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Key Design Decisions

1. **Installments as array on frontend**: The DB stores flat columns (`installment_1_*`, `installment_2_*`, etc.) but the frontend type uses an `installments: Installment[]` array for easier iteration in components. The transformation happens in the API route's `transformSale()` function.

2. **Status enums as string unions**: Matches the existing pattern for `CustomerStatus`, `PipelineStageType`, etc.

3. **Labels in Portuguese (PT-BR)**: Matches existing label patterns (`CUSTOMER_STATUS_LABELS`, etc.) since the CRM is Brazilian.
