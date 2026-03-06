# 01 — Installment System (Parcelas): Overview

## Goal

Build a complete **Installment (Parcela) System** for the CRM Consórcio. This includes:

1. **Prisma schema** — new `Parcela` model linked to `Lead`
2. **API layer** — endpoints for generating, listing and paying installments
3. **Financial Dashboard** (`/financeiro`) — global view with Upcoming / Overdue / Paid tabs
4. **Lead Details Drawer tab** — a "Parcelas" tab for generating installment plans and managing payments per-lead

## Architecture Snapshot

```
prisma/schema.prisma          ← add Parcela model
src/
├── app/api/parcelas/          ← API routes (CRUD + batch generate + pay)
├── app/(dashboard)/financeiro/page.tsx  ← server page (session guard)
├── lib/api/parcelas.ts        ← client-side fetch wrappers
├── modules/financeiro/        ← module folder for dashboard
│   ├── types.ts
│   ├── hooks/
│   │   └── use-financeiro-dashboard.ts
│   ├── components/
│   │   ├── financeiro-tabs.tsx
│   │   └── parcela-list-item.tsx
│   ├── page.tsx               ← ModuloFinanceiro (client component)
│   └── index.ts
├── modules/kanban/
│   ├── components/
│   │   └── lead-parcelas-tab.tsx  ← extracted Parcelas tab component
│   └── hooks/
│       └── use-lead-parcelas.ts   ← hook for drawer parcela logic
└── components/
    └── sidebar-principal.tsx  ← add "Financeiro" menu entry
```

## 500-line Constraint Compliance

| File | Estimated Lines | Notes |
|------|----------------|-------|
| `schema.prisma` (updated) | ~300 | Adds ~20 lines |
| `src/app/api/parcelas/route.ts` | ~180 | GET + POST (batch generate) |
| `src/app/api/parcelas/[id]/pagar/route.ts` | ~60 | PATCH to mark paid |
| `src/lib/api/parcelas.ts` | ~90 | Client wrappers |
| `src/modules/financeiro/types.ts` | ~40 | Type defs |
| `src/modules/financeiro/hooks/use-financeiro-dashboard.ts` | ~120 | Fetch + pay logic |
| `src/modules/financeiro/components/financeiro-tabs.tsx` | ~200 | Tab UI |
| `src/modules/financeiro/components/parcela-list-item.tsx` | ~100 | Reusable card |
| `src/modules/financeiro/page.tsx` | ~60 | ModuloFinanceiro shell |
| `src/modules/financeiro/index.ts` | ~3 | Barrel export |
| `src/modules/kanban/hooks/use-lead-parcelas.ts` | ~140 | Hook for drawer |
| `src/modules/kanban/components/lead-parcelas-tab.tsx` | ~280 | Tab UI with form + list |
| `src/components/sidebar-principal.tsx` (updated) | ~275 | +10 lines |
| `src/modules/kanban/components/lead-details-drawer.tsx` (updated) | ~680 | Adds ~20 lines for 3rd tab trigger + lazy load |

## Key Design Decisions

1. **Reusable `<ParcelaListItem />`** — shared between `/financeiro` dashboard and `LeadParcelasTab` to avoid duplication
2. **Optimistic UI** — Marking as paid uses `useState` to instantly flip the UI, then confirms/reverts on server response
3. **Dynamic "ATRASADO" status** — Computed on read (client side + API side) rather than stored, so it's always fresh
4. **Modular hooks** — `useLeadParcelas` (drawer) and `useFinanceiroDashboard` (global page) are fully independent
5. **Batch insert with date math** — Server-side loop adds months correctly using `Date.setMonth()` with end-of-month clamping
