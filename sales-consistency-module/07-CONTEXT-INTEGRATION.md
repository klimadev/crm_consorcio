# Step 07 — CRM Context Integration

## Overview

Integrate the `salesApi` into `CRMContext.tsx` using React Query, following the exact pattern used for deals, customers, products, etc.

---

## Changes to `src/context/CRMContext.tsx`

### 1. Update Imports

```diff
 import {
   PDV, Employee, Product, Customer, Deal, PipelineStage,
+  Sale, SaleConsistencyStatus,
 } from '@/types';
 import {
   dealsApi,
   customersApi,
   productsApi,
   employeesApi,
   pdvsApi,
   stagesApi,
+  salesApi,
 } from '@/services/api';
```

### 2. Extend `CRMContextData` Interface

Add the following fields to the interface:

```typescript
// Sales Validation
sales: Sale[] | undefined;
salesLoading: boolean;
salesCounts: Record<SaleConsistencyStatus, number> | undefined;
addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'installments' | 'sellerId' | 'sellerName' | 'consistencyStatus' | 'validatedBy' | 'validatedAt' | 'validationNotes'>) => void;
updateSale: (sale: Partial<Sale> & { id: string }) => void;
removeSale: (id: string) => void;
validateSale: (saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes?: string) => void;
updateInstallment: (saleId: string, installmentNumber: 1|2|3|4, status: 'PENDING'|'RECEIVED'|'OVERDUE', receivedDate?: string) => void;
refreshSales: () => void;
```

### 3. Add React Query Hooks Inside `CRMProvider`

```typescript
// ─── Sales Queries ──────────────────────────────────────
const { data: sales, isLoading: salesLoading } = useQuery({
  queryKey: ['sales'],
  queryFn: () => salesApi.getAll(),
  enabled: !!currentUserState?.id,
});

const { data: salesCounts } = useQuery({
  queryKey: ['sales-counts'],
  queryFn: () => salesApi.getCounts(),
  enabled: !!currentUserState?.id,
  refetchInterval: 30000, // Auto-refresh counts every 30s
});

// ─── Sales Mutations ─────────────────────────────────────
const addSaleMutation = useMutation({
  mutationFn: (sale: any) => salesApi.create(sale),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
  },
});

const updateSaleMutation = useMutation({
  mutationFn: ({ id, ...data }: Partial<Sale> & { id: string }) => 
    salesApi.update(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
  },
});

const removeSaleMutation = useMutation({
  mutationFn: (id: string) => salesApi.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
  },
});

const validateSaleMutation = useMutation({
  mutationFn: ({ saleId, status, notes }: { saleId: string; status: 'CONSISTENT' | 'INCONSISTENT'; notes?: string }) =>
    salesApi.validate(saleId, status, notes),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
  },
});

const updateInstallmentMutation = useMutation({
  mutationFn: ({ saleId, installmentNumber, status, receivedDate }: {
    saleId: string; installmentNumber: 1|2|3|4; status: string; receivedDate?: string;
  }) => salesApi.updateInstallment(saleId, installmentNumber, status as any, receivedDate),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  },
});

const refreshSales = () => {
  queryClient.invalidateQueries({ queryKey: ['sales'] });
  queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
};
```

### 4. Include in Context Value

Add to the `value` object of `<CRMContext.Provider>`:

```typescript
// Sales
sales,
salesLoading,
salesCounts,
addSale: (sale) => addSaleMutation.mutate(sale),
updateSale: (sale) => updateSaleMutation.mutate(sale),
removeSale: (id) => removeSaleMutation.mutate(id),
validateSale: (saleId, status, notes) => validateSaleMutation.mutate({ saleId, status, notes }),
updateInstallment: (saleId, installmentNumber, status, receivedDate) =>
  updateInstallmentMutation.mutate({ saleId, installmentNumber, status, receivedDate }),
refreshSales,
```

---

## Key Behaviors

1. **Auto-refresh counts**: `salesCounts` query has `refetchInterval: 30000` to keep badge counts fresh without manual refresh.
2. **Optimistic invalidation**: All mutations invalidate both `['sales']` and `['sales-counts']` for immediate UI updates.
3. **Role-aware loading**: Sales query is enabled only when `currentUserState?.id` exists (user is logged in).
