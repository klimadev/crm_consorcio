# 07 — Step-by-Step Implementation Order

## Phase 1: Backend Foundation

### Step 1.1 — Prisma Schema
- [ ] Add `Parcela` model to `prisma/schema.prisma`
- [ ] Add `parcelas Parcela[]` relation to `Lead` and `Empresa` models
- [ ] Run `npx prisma migrate dev --name add_parcela_model`
- [ ] Run `npx prisma generate`
- [ ] Verify: Open Prisma Studio (`npx prisma studio`) and confirm the `Parcela` table exists

### Step 1.2 — API Routes
- [ ] Create `src/app/api/parcelas/route.ts` with GET + POST handlers
- [ ] Create `src/app/api/parcelas/[id]/pagar/route.ts` with PATCH handler
- [ ] Implement `gerarDatasVencimento()` utility function with end-of-month clamping
- [ ] Verify: Test with curl/Postman:
  - `POST /api/parcelas` with sample payload → expect 201
  - `GET /api/parcelas?id_lead=<id>` → expect list
  - `PATCH /api/parcelas/<id>/pagar` → expect updated parcela with status PAGO

---

## Phase 2: Client API Layer

### Step 2.1 — API Client
- [ ] Create `src/lib/api/parcelas.ts` with all 4 functions
- [ ] Verify: Import in a temp file and ensure TypeScript compiles

---

## Phase 3: Lead Details Drawer Integration

### Step 3.1 — Hook
- [ ] Create `src/modules/kanban/hooks/use-lead-parcelas.ts`
- [ ] Implement `computarStatus()` for dynamic ATRASADO detection
- [ ] Implement optimistic pay pattern
- [ ] Verify: Hook compiles, can be imported

### Step 3.2 — Tab Component
- [ ] Create `src/modules/kanban/components/lead-parcelas-tab.tsx`
- [ ] Implement empty state with generator form
- [ ] Implement list state with ParcelaCard and StatusBadgeParcela
- [ ] Implement PayParcelaPopover inline component
- [ ] Verify: Component can render without errors

### Step 3.3 — Drawer Modification
- [ ] Modify `lead-details-drawer.tsx`:
  - Add import for `LeadParcelasTab` and `Banknote`
  - Change `grid-cols-2` → `grid-cols-3`
  - Add 3rd `TabsTrigger` for "Parcelas"
  - Add 3rd `TabsContent` rendering `<LeadParcelasTab>`
- [ ] Verify: Open a lead drawer → see 3 tabs → click "Parcelas"

---

## Phase 4: Financial Dashboard

### Step 4.1 — Module Structure
- [ ] Create `src/modules/financeiro/types.ts`
- [ ] Create `src/modules/financeiro/index.ts`

### Step 4.2 — Hook
- [ ] Create `src/modules/financeiro/hooks/use-financeiro-dashboard.ts`
- [ ] Implement tab switching + per-tab fetch
- [ ] Implement optimistic pay pattern

### Step 4.3 — Components
- [ ] Create `src/modules/financeiro/components/parcela-list-item.tsx`
- [ ] Create `src/modules/financeiro/components/financeiro-tabs.tsx`
- [ ] Create `src/modules/financeiro/page.tsx` (ModuloFinanceiro)

### Step 4.4 — Route Page
- [ ] Create `src/app/(dashboard)/financeiro/page.tsx` (server component with session guard)
- [ ] Verify: Navigate to `/financeiro` → see the dashboard page

---

## Phase 5: Sidebar & Polish

### Step 5.1 — Sidebar
- [ ] Modify `src/components/sidebar-principal.tsx`:
  - Import `Wallet` icon
  - Add "Financeiro" item under OPERAÇÃO section
- [ ] Verify: Sidebar shows "Financeiro" link → click → navigates correctly

### Step 5.2 — End-to-End Verification
- [ ] Full flow test:
  1. Open a lead in the kanban → go to "Parcelas" tab
  2. Fill in installment form (e.g. R$ 1.500, 60 parcelas, 10/04/2026)
  3. Click "Gerar Plano de Pagamento"
  4. Verify all 60 parcelas appear in the list
  5. Hover a parcela → click "Marcar como Pago" → confirm date → verify badge turns green
  6. Navigate to `/financeiro` → verify the parcela appears under "Recebidas" tab
  7. Check "Atrasadas" tab for overdue parcelas (if any past-dated ones exist)
  8. Check "Próximos Vencimentos" for upcoming parcelas

---

## File Summary (final count)

| # | File | Action | Est. Lines |
|---|------|--------|------------|
| 1 | `prisma/schema.prisma` | MODIFY | +20 → ~300 |
| 2 | `src/app/api/parcelas/route.ts` | NEW | ~180 |
| 3 | `src/app/api/parcelas/[id]/pagar/route.ts` | NEW | ~60 |
| 4 | `src/lib/api/parcelas.ts` | NEW | ~90 |
| 5 | `src/modules/kanban/hooks/use-lead-parcelas.ts` | NEW | ~140 |
| 6 | `src/modules/kanban/components/lead-parcelas-tab.tsx` | NEW | ~280 |
| 7 | `src/modules/kanban/components/lead-details-drawer.tsx` | MODIFY | +20 → ~683 |
| 8 | `src/modules/financeiro/types.ts` | NEW | ~40 |
| 9 | `src/modules/financeiro/hooks/use-financeiro-dashboard.ts` | NEW | ~120 |
| 10 | `src/modules/financeiro/components/parcela-list-item.tsx` | NEW | ~100 |
| 11 | `src/modules/financeiro/components/financeiro-tabs.tsx` | NEW | ~200 |
| 12 | `src/modules/financeiro/page.tsx` | NEW | ~60 |
| 13 | `src/modules/financeiro/index.ts` | NEW | ~3 |
| 14 | `src/app/(dashboard)/financeiro/page.tsx` | NEW | ~15 |
| 15 | `src/components/sidebar-principal.tsx` | MODIFY | +10 → ~275 |

**Total new files: 12 | Modified files: 3 | All files ≤500 lines ✅**
