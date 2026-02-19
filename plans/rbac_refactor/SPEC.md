# SPEC - RBAC Refactor and Legacy Feature Extraction

## 0) Scope and goal
- Plan mode only: no functional code changes in this document.
- Primary objective: stabilize auth/permissions while preparing deep core rewrite.
- Requested removals in scope: User Selector (sidebar), Produtos/Planos, Validação de Vendas legacy traces, pendencias/proximo contato visual cues.

## 1) Deep exploration findings (with dependency graph)

### 1.1 Architectural reality (critical)
- The repository currently runs in **dual-stack mode**:
  - Legacy stack: `tenants/users/deals/products/sales` via `src/lib/db/client.ts` + `src/lib/db/operations.ts` + `/api/db/*` routes + `src/app/page.tsx` + `CRMContext`.
  - New stack: `companies/memberships/leads/pdvs/teams` via `src/lib/db/schema.sql` + repositories + domain services + `/api/leads|pdvs|teams|managers/*` + `src/app/leads/page.tsx` and `src/app/settings/page.tsx`.
- This split is the main risk vector for regressions and hidden reference coupling.

### 1.2 References discovered: Produtos / Initial Products
- Legacy DB + operations:
  - `src/lib/db/client.ts` (table `products`, FK from `deals.product_id` and `sales.product_id`)
  - `src/lib/db/operations.ts` (`createProduct`, `getProductsByTenant`, `updateProduct`, `deleteProduct`, deal and sales product fields)
  - `src/lib/db/schema.ts` (exports `Product`)
  - `src/types/db/index.ts` (`Product`, `Deal.product_ids`, `Sale.product_id/product_name`)
  - `src/hooks/useTenantData.ts` (expects `result.products`)
- Legacy APIs that still pass product placeholders:
  - `src/app/api/db/deals/route.ts`
  - `src/app/api/entities/deals/route.ts`
- Visual mention in dashboard tab copy:
  - `src/components/DashboardBI.tsx` (`Seguro & Produto`)
- Seed metadata trace:
  - `src/app/api/db/init/route.ts` still advertises `products` in modules list.
- Note: current `src/constants/index.ts` no longer has `INITIAL_PRODUCTS`; stage-only constants are already in place.

### 1.3 References discovered: Validação de Vendas / Pendencias / Proximo Contato
- Legacy sales-validation model remains in code (backend side):
  - `src/lib/db/client.ts` (`sales` table with `consistency_status`, `validation_notes`, `plan_months`)
  - `src/lib/db/operations.ts` sales validation and installment functions
  - `src/types/db/index.ts` sales consistency types
- New leads consistency model (not legacy sales module):
  - `src/lib/db/schema.sql` (`leads.consistency_status`, `lead_consistency_checks`)
  - `src/lib/domain/leads/lead.service.ts` and `src/lib/auth/rbac.ts`
  - `src/app/leads/page.tsx` consistency panel UI
  - `src/services/api.ts` lead consistency payload contracts
- No active frontend strings found for `Pendencias` / `Proximo Contato` in current UI files, but legacy field `next_follow_up_date` remains in old deal schema path (`src/lib/db/client.ts`, `src/lib/db/operations.ts`, `src/types/db/index.ts`).

### 1.4 References discovered: User Selector in Sidebar
- Active visual selector still exists in `src/app/page.tsx`:
  - local state `showUserMenu`
  - employee list switch (`setCurrentUser(e)`)
  - dropdown trigger with `ChevronDown`
- Layout sidebar component (`src/components/layout/MainSidebar.tsx`) does not currently render selector, but still carries dead props (`employees`, `onEmployeeSelect`) and unused `ChevronDown` import.

### 1.5 Dependency graph (high level)
- `src/app/page.tsx` -> `CRMContext` -> `services/api.ts` -> `/api/db/*` -> `lib/db/operations.ts` -> `lib/db/client.ts`.
- `src/app/leads/page.tsx` -> `services/api.ts` -> `/api/leads/*` -> `domain/leads` + `repositories/*` -> `schema.sql`.
- Risk: removing product/validation only in UI without pruning old API/type contracts leaves latent runtime and TS coupling.

## 2) Database mapping and product-removal strategy

### 2.1 Current schema map relevant to request
- New canonical schema (`src/lib/db/schema.sql`): no `products` table; lead domain centered on memberships and ownership.
- Legacy runtime schema (`src/lib/db/client.ts`): has `products`, `deals.product_id/product_ids`, `sales.product_id/product_name` with FKs to `products(id)`.

### 2.2 Decision: Drop table vs Soft delete/nullify
**Decision for stability:** 2-phase approach.

1) **Phase A (stability now): Soft delete/nullify behavior, no hard drop**
- Stop all reads/writes to products in frontend and API contracts.
- Nullify legacy references where touched (`deals.product_id`, `sales.product_id`) and ignore `product_ids` payloads.
- Keep legacy `products` table temporarily to avoid FK explosions in old schema paths.

2) **Phase B (cutover): Hard drop after legacy stack deactivation**
- Recreate legacy `deals` and `sales` tables without product FKs/columns (SQLite requires table rebuild for FK/column removal).
- Then drop `products` safely.

### 2.3 Why not immediate hard drop
- In SQLite, dropping parent table while child tables still define foreign keys can destabilize inserts/updates and migration order.
- Legacy routes and operations still compile against product fields today; immediate drop has high blast radius.

## 3) Seed analysis

### 3.1 What is already stage-only
- `src/lib/db/operations.ts` -> `seedTenantData(...)` seeds only `INITIAL_STAGES`.
- `src/app/api/seed/route.ts` creates only stages.
- `scripts/seed-db.ts` and `scripts/seed-db-new.ts` are stage-only.

### 3.2 Remaining seed cleanups required
- `src/app/api/db/init/route.ts` still claims module list includes `products` and other removed modules; update copy to avoid operational confusion.
- `scripts/seed-db-prisma.ts.bak` still documents products (backup file; not runtime, but misleading for future operators).

## 4) Target RBAC architecture definition

## 4.1 Role model
- `Admin (Dono)` -> maps to canonical `OWNER` in DB, full company access.
- `Gerente (Manager)` -> canonical `MANAGER`, bound to a specific PDV scope, can read/write leads within that PDV and assign ownership.
- `Colaborador` -> canonical `COLLABORATOR`, read/write only leads assigned/owned by self (`owner_membership_id`).

### 4.2 Data model (canonical)
- Use `memberships` as source of truth:
  - `memberships.role` in (`OWNER`, `MANAGER`, `COLLABORATOR`)
  - `memberships.id` used as stable assignment key.
- PDV scoping for manager:
  - Keep `manager_scopes` for explicit scope entries.
  - Constrain manager to at least one PDV scope in write flows (service-level guard now; optional DB-level check in migration).
- Lead ownership:
  - `leads.owner_membership_id` mandatory.
  - Reassignment only by `OWNER`/`MANAGER` in scope.

### 4.3 Enforcement strategy: query-level filtering (not DB-native RLS)
- SQLite has no native RLS; implement deterministic filters in repository/domain layer.
- Keep middleware (`src/proxy.ts`) focused on auth presence.
- Authorization and row visibility enforced in:
  - `requireCompanySession` for identity context.
  - `loadVisibilityScope` + `leadRepository.listByScope` for row filtering.
  - explicit guards on mutate endpoints (PDV/team/lead transitions/assignment).

### 4.4 Required RBAC behavior to implement in rewrite
- `OWNER`: all leads.
- `MANAGER`: all leads where `pdv_id` is in manager scope (plus assignment control within scope).
- `COLLABORATOR`: only leads with `owner_membership_id == ctx.membershipId`.
- Stage transitions and consistency rules remain business policy, not role identity policy.

## 5) Unified Login and company creation spec

### 5.1 MUST - Unified login behavior (/login)
- Single page with two modes:
  - `Entrar` (Admin/Dono, Gerente, Colaborador all same form)
  - `Criar Empresa` (signup)
- Shared credentials contract: `companySlug + email + password` via NextAuth credentials provider.
- Role differentiation occurs post-auth from session token (`membership.role`), not by separate login screen.

### 5.2 MUST - New company creation flow in /login
- Signup form posts to `/api/public/signup` with `companyName`, `email`, `password`.
- Backend creates:
  - `companies` row
  - `users` row
  - `memberships` row as `OWNER`
  - default pipeline stages only
- Client auto-signs in through same credentials provider and redirects to callback (`/leads` default).
- Optional enhancement for parity: include `fullName` in signup payload and persist into `users.full_name` (currently ignored in service).

### 5.3 Route notes
- `/signup` can remain redirect-only to `/login` for backward compatibility.

## 6) MUST - Exact file list for removing Produtos + Validação without frontend ReferenceErrors

### 6.1 Frontend/layout/state
- `src/app/page.tsx` (remove sidebar user switcher; remove legacy selector state and handlers)
- `src/context/CRMContext.tsx` (remove `setCurrentUser` emulation path tied to selector; align with real session identity)
- `src/components/layout/MainSidebar.tsx` (remove dead selector props/imports)
- `src/components/DashboardBI.tsx` (remove/rename `Seguro & Produto` language and any product semantics)
- `src/services/api.ts` (remove product placeholders in legacy deal payload shape; keep canonical lead APIs)
- `src/hooks/useTenantData.ts` (remove `result.products` fallback)

### 6.2 API contracts touching product/validation legacy fields
- `src/app/api/db/deals/route.ts` (remove/nullify product args and transform dependencies)
- `src/app/api/entities/deals/route.ts` (same)
- `src/app/api/db/init/route.ts` (remove `products` module from init info response)

### 6.3 DB/types compatibility layer
- `src/lib/db/operations.ts` (deprecate product CRUD and remove product coupling from deal/sales write paths)
- `src/lib/db/client.ts` (migration path for removing product references in legacy schema)
- `src/lib/db/schema.ts` (remove `Product` export when decommissioned)
- `src/types/db/index.ts` (remove product model and product-linked fields after migration window)

### 6.4 Tests/docs that will otherwise fail or mislead
- `tests/e2e/auth-signup-login.spec.ts` (currently assumes old `/signup` placeholders)
- `tests/e2e/rbac-visibility.spec.ts` (same)
- `tests/e2e/sales-flow-consistency.spec.ts` (legacy validation scenario; must be replaced by lead/RBAC flows)
- `sales-consistency-module/*` (mark archived/deprecated to avoid future reintroduction)

## 7) Impact simulation (feature-removal dry run)

### 7.1 Simulated removal: sidebar user selector
- Remove dropdown UI in `src/app/page.tsx` only -> compiles.
- If `CRMContext.setCurrentUser` remains exposed but unused -> no immediate runtime break.
- If later `setCurrentUser` is removed from context contract without updating consumers -> `Property 'setCurrentUser' does not exist` in `src/app/page.tsx`.
- Safe order: remove consumer usage first, then contract cleanup.

### 7.2 Simulated removal: product fields from types first
- Remove product fields from `src/types/db/index.ts` before updating `operations.ts` and API routes -> TypeScript errors in:
  - `src/lib/db/operations.ts`
  - `src/app/api/db/deals/route.ts`
  - `src/app/api/entities/deals/route.ts`
- Safe order: route and operation decoupling first, type pruning after call sites are clean.

### 7.3 Simulated DB hard drop of products first
- Drop `products` in legacy DB while keeping `deals/sales` FK definitions -> migration/runtime risk on write paths.
- Safe order: introduce compatibility migration (nullify + table rebuild), then drop.

### 7.4 Simulated removal of consistency UI in leads
- Removing `consistencyStatus` from API contracts before updating `src/app/leads/page.tsx` breaks stage badges/details panel rendering.
- If business wants to remove only legacy sales validation, **do not remove leads consistency** until replacement stage policy is approved.

## 8) Safety check and regression plan

### 8.1 Mandatory validation pipeline per iteration
1. `npm run lint`
2. `npm run build`
3. Manual logic pass on critical flows

### 8.2 Manual regression matrix (feature X vs page Y)
- Remove sidebar selector (X) -> verify `/` and `/leads` still show authenticated user identity and do not allow impersonation.
- Remove product payload fields (X) -> verify Kanban create/edit deal in `/` and API responses from `/api/db/deals`.
- Remove validation legacy traces (X) -> verify `/leads` stage transitions, consistency check route, and history route still work.
- Adjust login/signup flow (X) -> verify `/login` tab switch, signup -> auto-login -> redirect, and login for existing collaborator.
- Tighten RBAC (X) -> verify `/api/leads` visibility for OWNER/MANAGER/COLLABORATOR and `/settings` role restrictions.

### 8.3 Test updates required for safety
- Rewrite e2e auth tests to `/login` unified form selectors.
- Replace `sales-flow-consistency.spec.ts` by:
  - manager-scope visibility scenario
  - collaborator isolation scenario
  - owner full-access scenario

## 9) Recommended execution phases
- Phase 1: UI extraction (selector + product wording) with no schema drop.
- Phase 2: API contract normalization (remove legacy product args and dead fields).
- Phase 3: RBAC hardening and assignment rules in service layer.
- Phase 4: legacy schema migration (product FK removal and eventual table drop).
- Phase 5: test suite migration and release gate.

---

## Deliverable status
- This SPEC is generated at: `plans/rbac_refactor/SPEC.md`
- No functional code was implemented in this step.
