# Step 06 — UI Components

## Overview

Create 4 new components in `src/components/`:

1. **`ValidatorDashboard.tsx`** — The main view for the "Validação de Vendas" nav tab
2. **`SaleSubmissionForm.tsx`** — Modal form for salespeople to submit new sales
3. **`ValidationModal.tsx`** — Modal for validators to approve/reject a sale
4. **`InstallmentGrid.tsx`** — Grid component showing 4 installments with status toggles

---

## 1. `ValidatorDashboard.tsx`

### Purpose
Main page-level component that shows a filterable queue of sales organized by tabs (Awaiting/Consistent/Inconsistent), with badge counts, and opens modals for validation and installment tracking.

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  [+ Nova Venda]                           [Badge Counts]     │
│                                                              │
│  Tabs: [ Aguardando (5) ] [ Consistente (12) ] [ Incons. (2)]│
├──────────────────────────────────────────────────────────────┤
│  Search: [_______________]   Filter by: PDV [▼]  Seller [▼] │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Sale Card                                               │  │
│  │ João Silva • R$ 50.000 • Consórcio Auto                │  │
│  │ Vendedor: Maria Santos • PDV: Loja Centro              │  │
│  │ Created: 09/02/2026                                     │  │
│  │ [Status Badge: Aguardando Consistência]                 │  │
│  │                                                         │  │
│  │ Installments: [●Pend] [●Pend] [●Pend] [●Pend]         │  │
│  │                                                         │  │
│  │ [Validar ▼]  [Ver Detalhes]                            │  │
│  └────────────────────────────────────────────────────────┘  │
│  (... more cards ...)                                        │
└──────────────────────────────────────────────────────────────┘
```

### Skeleton Code

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/services/api';
import { useCRM } from '@/context';
import { SaleSubmissionForm } from './SaleSubmissionForm';
import { ValidationModal } from './ValidationModal';
import { InstallmentGrid } from './InstallmentGrid';
import type { Sale, SaleConsistencyStatus } from '@/types';
import { 
  SALE_CONSISTENCY_STATUS_LABELS, 
  SALE_CONSISTENCY_STATUS_COLORS 
} from '@/types';
import { 
  Plus, Search, CheckCircle2, XCircle, Clock, 
  Filter, ChevronDown 
} from 'lucide-react';

type TabFilter = 'ALL' | SaleConsistencyStatus;

export const ValidatorDashboard: React.FC = () => {
  const { currentUser, pdvs, employees } = useCRM();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<TabFilter>('AWAITING_CONSISTENCY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  // React Query: fetch sales
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', activeTab],
    queryFn: () => salesApi.getAll(
      activeTab !== 'ALL' ? { status: activeTab } : undefined
    ),
  });

  // React Query: fetch counts for badges
  const { data: counts } = useQuery({
    queryKey: ['sales-counts'],
    queryFn: () => salesApi.getCounts(),
  });

  const isValidator = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  // Filtered sales based on search
  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(s => 
      s.customerName.toLowerCase().includes(term) ||
      s.sellerName.toLowerCase().includes(term) ||
      s.productName?.toLowerCase().includes(term)
    );
  }, [sales, searchTerm]);

  // Render tabs, cards, modals...
  // (Full implementation follows the existing patterns from KanbanBoard.tsx)
};
```

### Key Features
- **Tab navigation** with badge counts per status
- **Search bar** for filtering by customer/seller/product name  
- **"+ Nova Venda" button** opens `SaleSubmissionForm` modal
- **Sale cards** with status badge, installment dots, and action buttons
- **Conditional rendering**: SALES_REP sees only their own sales and "Submit" button; ADMIN/MANAGER see all and get "Validate" buttons

---

## 2. `SaleSubmissionForm.tsx`

### Purpose
Modal form for creating or editing a sale submission. Uses the existing `Modal.tsx` component as a wrapper.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Customer | Select (from `customers`) | ✅ | Auto-fills `customerName` |
| Product | Select (from `products`) | ❌ | Auto-fills `productName` |
| PDV | Select (from `pdvs`) | ❌ | Defaults to current user's PDV |
| Total Value | Currency input | ✅ | R$ formatted |
| Credit Value | Currency input | ❌ | Carta de crédito |
| Plan (months) | Number input | ❌ | Plan duration |
| Installment 1-4 Due Date | Date inputs | ❌ | When each is due |
| Installment 1-4 Value | Currency inputs | ❌ | Individual amounts |
| Notes | Textarea | ❌ | General observations |

### Skeleton

```typescript
'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context';
import { Modal } from './Modal';
import type { Sale } from '@/types';
import { Save, CalendarDays, Wallet, User } from 'lucide-react';

interface SaleSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Sale>) => void;
  existingSale?: Sale | null; // For editing
}

export const SaleSubmissionForm: React.FC<SaleSubmissionFormProps> = ({
  isOpen, onClose, onSave, existingSale
}) => {
  const { customers, products, pdvs, currentUser } = useCRM();
  
  // Form state mirrors Sale fields
  const [customerName, setCustomerName] = useState(existingSale?.customerName || '');
  // ... other fields
  
  // Re-use inputClass / selectClass from DealForm.tsx
  // Submit calls onSave with the form data
};
```

---

## 3. `ValidationModal.tsx`

### Purpose
Modal that appears when a validator clicks "Validar" on a sale card. Shows sale details and provides two action buttons: ✅ Consistente / ❌ Inconsistente, plus an optional notes field.

### Layout

```
┌─────────────────────────────────────────────┐
│  Validar Venda                          [X] │
├─────────────────────────────────────────────┤
│  Cliente: João Silva                        │
│  Vendedor: Maria Santos                     │
│  Produto: Consórcio Auto 50k               │
│  Valor Total: R$ 50.000,00                 │
│  Crédito: R$ 50.000,00                     │
│  Prazo: 60 meses                           │
│                                             │
│  Parcelas:                                  │
│  1ª: R$ 833 — Venc: 01/03/2026             │
│  2ª: R$ 833 — Venc: 01/04/2026             │
│  3ª: R$ 833 — Venc: 01/05/2026             │
│  4ª: R$ 833 — Venc: 01/06/2026             │
│                                             │
│  Observações da Validação:                  │
│  [_________________________________]        │
│                                             │
│  [ ✅ Consistente ]    [ ❌ Inconsistente ] │
└─────────────────────────────────────────────┘
```

### Skeleton

```typescript
'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import type { Sale } from '@/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onValidate: (saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes: string) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen, onClose, sale, onValidate
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (status: 'CONSISTENT' | 'INCONSISTENT') => {
    setLoading(true);
    await onValidate(sale.id, status, notes);
    setLoading(false);
    onClose();
  };

  // Uses Modal from @/components, displays sale info, notes textarea, 
  // two action buttons with distinct colors
};
```

---

## 4. `InstallmentGrid.tsx`

### Purpose
Reusable grid component showing the 4 installment cards for a sale, with status badges and "Mark as Received" actions.

### Layout

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 1ª Parc. │ │ 2ª Parc. │ │ 3ª Parc. │ │ 4ª Parc. │
│ R$ 833   │ │ R$ 833   │ │ R$ 833   │ │ R$ 833   │
│ 01/03/26 │ │ 01/04/26 │ │ 01/05/26 │ │ 01/06/26 │
│ [Pendente]│ │ [Recebida]│ │ [Pend.] │ │ [Atras.]│
│ [Marcar]  │ │    ✅    │ │ [Marcar] │ │ [Marcar] │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Skeleton

```typescript
'use client';

import React from 'react';
import type { Installment, InstallmentStatus } from '@/types';
import { INSTALLMENT_STATUS_LABELS, INSTALLMENT_STATUS_COLORS } from '@/types';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface InstallmentGridProps {
  installments: Installment[];
  saleId: string;
  canEdit: boolean; // Only ADMIN/MANAGER
  onUpdateStatus: (
    saleId: string, 
    installmentNumber: 1 | 2 | 3 | 4, 
    status: InstallmentStatus
  ) => void;
}

export const InstallmentGrid: React.FC<InstallmentGridProps> = ({
  installments, saleId, canEdit, onUpdateStatus
}) => {
  // Renders a 4-column grid (CSS grid: grid-cols-4)
  // Each cell shows: number, value, due date, status badge, action button
  // Action button toggles: PENDING -> RECEIVED -> OVERDUE (cycle or dropdown)
};
```

---

## Component Export

Update `src/components/index.ts`:

```diff
 export { KanbanBoard } from './KanbanBoard';
 export { DashboardBI } from './DashboardBI';
 export { Modal } from './Modal';
 export { DealForm } from './DealForm';
+export { ValidatorDashboard } from './ValidatorDashboard';
+export { SaleSubmissionForm } from './SaleSubmissionForm';
+export { ValidationModal } from './ValidationModal';
+export { InstallmentGrid } from './InstallmentGrid';
```

---

## Styling Guidelines

Follow the existing Tailwind patterns from `KanbanBoard.tsx` and `DealForm.tsx`:

- **Background**: `bg-slate-50` for page, `bg-white` for cards
- **Cards**: `rounded-xl border border-slate-200 shadow-sm`
- **Status badges**: Use the color maps from `SALE_CONSISTENCY_STATUS_COLORS`
- **Inputs**: Use `inputClass` and `selectClass` constants from `DealForm.tsx`
- **Action buttons**: Primary `bg-blue-600 text-white`, Danger `bg-red-600 text-white`
- **Icons**: From `lucide-react`
