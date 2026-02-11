# Step 05 — Frontend Services Layer

## Overview

Add a `salesApi` object to `src/services/api.ts` following the exact same pattern as `dealsApi`, `customersApi`, etc.

---

## Code to Add — `src/services/api.ts`

### 1. Import the new types

Update the import block at the top:

```diff
 import {
   Deal,
   Customer,
   Product,
   Employee,
   PDV,
   PipelineStage,
   CommercialDashboardFilters,
   CommercialDashboardMetrics,
+  Sale,
+  SaleConsistencyStatus,
 } from '@/types';
```

### 2. Add the salesApi object

Add after the `dealsApi` block:

```typescript
// Sales Validation API
export const salesApi = {
  getAll: (filters?: { status?: SaleConsistencyStatus; sellerId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.sellerId) params.set('sellerId', filters.sellerId);
    const query = params.toString();
    return api.get<Sale[]>(query ? `/db/sales?${query}` : '/db/sales');
  },
  
  getCounts: () => api.get<Record<SaleConsistencyStatus, number>>('/db/sales?counts=true'),
  
  getById: (id: string) => getById<Sale>('/db/sales', id),
  
  create: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'installments' | 'sellerId' | 'sellerName' | 'consistencyStatus' | 'validatedBy' | 'validatedAt' | 'validationNotes'>) => 
    api.post<Sale>('/db/sales', sale),
  
  update: (id: string, sale: Partial<Sale>) => 
    updateById<Sale>('/db/sales', id, sale),
  
  delete: (id: string) => deleteById('/db/sales', id),
  
  validate: (saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes?: string) =>
    api.post<{ success: boolean; sale: Sale }>('/db/sales/validate', { saleId, status, notes }),
  
  updateInstallment: (
    saleId: string, 
    installmentNumber: 1 | 2 | 3 | 4, 
    status: 'PENDING' | 'RECEIVED' | 'OVERDUE',
    receivedDate?: string
  ) => api.put<{ success: boolean; sale: Sale }>('/db/sales/installments', {
    saleId, installmentNumber, status, receivedDate,
  }),
};
```

---

## Usage Examples

```typescript
// Fetch all awaiting validation
const pending = await salesApi.getAll({ status: 'AWAITING_CONSISTENCY' });

// Create a new sale
const newSale = await salesApi.create({
  customerName: 'João Silva',
  customerId: 'cust-123',
  totalValue: 50000,
  creditValue: 50000,
  planMonths: 60,
  productId: 'prod-abc',
  productName: 'Consórcio Auto 50k',
  pdvId: 'pdv-1',
  notes: 'Primeira venda do cliente',
});

// Validate a sale
await salesApi.validate('sale-xyz', 'CONSISTENT', 'Dados conferidos OK');

// Mark installment as received
await salesApi.updateInstallment('sale-xyz', 1, 'RECEIVED', '2026-03-01');

// Get dashboard counts
const counts = await salesApi.getCounts();
// => { AWAITING_CONSISTENCY: 5, CONSISTENT: 12, INCONSISTENT: 2 }
```
