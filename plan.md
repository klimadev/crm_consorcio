# CRM Forensic Rebuild Plan (User System, Login, RBAC)

## Act 1 - Deep Research and Context

### 1) Project structure snapshot
- App router only (no `/pages` folder):
  - `/src/app` -> UI routes (`/`, `/login`, `/signup`, `/leads`, `/settings`) and API routes under `/src/app/api/**`
  - `/src/components` -> old CRM UI (kanban/dashboard/products/validation) + newer layout/shell pieces
  - `/src/lib` -> auth, RBAC, DB repositories/domain services
  - `/src/context` -> legacy `CRMContext` state orchestration
  - `/src/services/api.ts` -> HTTP clients (currently mixed and incomplete for new pages)
  - `/scripts` -> DB init/seed/migration helpers
- `package.json` scripts used by this repo:
  - `npm run build`, `npm run lint`, `npm run db:init`, `npm run db:seed`, `npm run db:setup`

### 2) DB schema reality (critical instability source)
There are two active DB models in parallel.

1. Legacy model (tenant-based)
- Source: `/src/lib/db/client.ts`, `/src/lib/db/operations.ts`, `/src/types/db/index.ts`
- Core tables: `tenants`, `users(tenant_id, pdv_id, role=ADMIN/MANAGER/SALES_REP/SUPPORT)`, `products`, `deals(product_ids,next_follow_up_date)`, `sales(consistency_status)`.

2. New model (company + memberships)
- Source: `/src/lib/db/schema.sql`, `/src/lib/db/connection.ts`, repositories under `/src/lib/db/repositories/**`
- Core tables: `companies`, `users`, `memberships(role=OWNER/MANAGER/COLLABORATOR)`, `pdvs`, `teams`, `team_members`, `manager_scopes`, `leads(owner_membership_id,pdv_id,team_id)`.

Impact:
- Current codebase mixes both schemas and both API families (`/api/db/*` and newer `/api/leads|pdvs|teams|managers/*`).
- This split is the main reason auth/RBAC and feature behavior are unstable.

### 3) Auth + middleware reality (critical instability source)
There are two auth stacks in parallel.

1. Legacy custom JWT/cookie stack
- Files: `/src/hooks/useAuth.tsx`, `/src/app/api/auth/login/route.ts`, `/src/app/api/auth/me/route.ts`, `/src/lib/auth/jwt.ts`, `/src/lib/auth/auth.ts`
- Uses `tenantSlug`, legacy `users` table, and old role set.

2. NextAuth credentials stack (company/membership)
- Files: `/src/lib/auth/auth.config.ts`, `/src/app/api/auth/[...nextauth]/route.ts`, `/src/lib/auth/session.ts`, `/src/app/api/me/route.ts`
- Uses `companySlug`, `memberships`, and role in session (`OWNER/MANAGER/COLLABORATOR`).

Middleware
- `/src/proxy.ts` uses `next-auth/jwt` token checks and public routes (`/login`, `/signup`, `/api/auth`, `/api/public`).

Impact:
- Login UI and data layer do not consistently use the same auth/session contract.

### 4) File reference map: Planos, Produtos, Validacao

#### A) Planos references
- `/src/app/page.tsx` -> nav label/title `Planos`
- `/src/components/layout/navigation.ts` -> nav label/title `Planos`
- `/src/components/SettingsViews.tsx` -> `ProductsView` labels and plan CRUD copy
- `/src/components/DealForm.tsx` -> `Plano` field in deal form
- `/src/components/SaleSubmissionForm.tsx` -> `Plano` field in sale submission form

#### B) Produtos references (UI, API, DB, seeds)
Frontend/state/services
- `/src/components/SettingsViews.tsx`
- `/src/components/DealForm.tsx`
- `/src/components/KanbanBoard.tsx`
- `/src/components/ValidatorDashboard.tsx`
- `/src/components/ValidationModal.tsx`
- `/src/components/SaleSubmissionForm.tsx`
- `/src/context/CRMContext.tsx`
- `/src/services/api.ts`
- `/src/types/index.ts`
- `/src/components/index.ts`

API/routes
- `/src/app/api/db/products/route.ts`
- `/src/app/api/entities/products/route.ts`
- `/src/app/api/db/deals/route.ts` (product fields in deal payload)
- `/src/app/api/entities/deals/route.ts` (product fields in deal payload)
- `/src/app/api/seed/route.ts`

DB + seed sources
- `/src/lib/db/operations.ts`
- `/src/lib/db/client.ts`
- `/src/lib/db/schema.ts`
- `/src/types/db/index.ts`
- `/src/constants/index.ts` (`INITIAL_PRODUCTS`, product-linked deals)
- `/scripts/seed-db.ts`
- `/scripts/seed-db-new.ts`

#### C) Validacao de Vendas references (legacy sales validation module)
UI
- `/src/app/page.tsx` (`sales_validation` tab, badge)
- `/src/components/layout/navigation.ts`
- `/src/components/layout/MainSidebar.tsx` (badge)
- `/src/components/ValidatorDashboard.tsx`
- `/src/components/ValidationModal.tsx`
- `/src/components/SaleSubmissionForm.tsx`
- `/src/components/InstallmentGrid.tsx`
- `/src/components/index.ts`
- `/src/context/CRMContext.tsx`
- `/src/services/api.ts`
- `/src/types/index.ts`

API/routes
- `/src/app/api/db/sales/route.ts`
- `/src/app/api/db/sales/validate/route.ts`
- `/src/app/api/db/sales/installments/route.ts`
- `/src/app/api/db/migrate-sales/route.ts`

DB
- `/src/lib/db/operations.ts` (sales consistency functions)
- `/src/lib/db/client.ts` (`sales` table)
- `/src/types/db/index.ts` (sales consistency enum)

Note:
- New leads consistency (`PENDING/VALID/INCONSISTENT`) exists in `/src/lib/db/schema.sql` + `/src/lib/domain/leads/**` and is separate from legacy sales-validation module.

### 5) How PDV and Equipes are linked to users today

Legacy link (old stack)
- `users.pdv_id` directly binds user to PDV.
- Used by old role filtering in `/src/context/CRMContext.tsx` and `/src/components/KanbanBoard.tsx`.

New link (target stack)
- User identity in `users`, company role in `memberships`.
- Team relation via `team_members(membership_id -> team_id)`.
- Manager scope via `manager_scopes` with `scope_type = PDV|TEAM`.
- Leads store `pdv_id`, `team_id`, and `owner_membership_id`.
- Scope enforcement in `/src/lib/auth/rbac.ts` and `/src/lib/domain/leads/lead.service.ts`.

Current RBAC gaps to address
- `/src/lib/auth/rbac.ts` has TODO/fallthrough behavior for unhandled roles.
- `/src/app/api/pdvs/route.ts` and `/src/app/api/teams/route.ts` have TODOs for missing mutation role guards.

---

## Dependency Map (what breaks when Planos is removed)

| File | Why it breaks after Planos removal | Fix approach |
|---|---|---|
| `/src/app/page.tsx` | Has `products` view/tab and label `Planos` | Remove `products` view state/nav/render branch |
| `/src/components/layout/navigation.ts` | Declares `products` nav item and title | Remove `products` item/type/title |
| `/src/components/index.ts` | Exports `ProductsView` | Remove `ProductsView` export |
| `/src/components/SettingsViews.tsx` | Contains full `ProductsView` CRUD and plan strings | Remove `ProductsView`; keep Customers/Team-PDV views only |
| `/src/context/CRMContext.tsx` | Product query/mutations/helpers and product-dependent context contract | Delete product state/actions/getters; update context interface |
| `/src/services/api.ts` | `productsApi` and sales payloads include product fields | Remove `productsApi`; remove product fields from affected payload models |
| `/src/types/index.ts` | Defines `Product` and `Deal.productIds`, `Sale.productId/productName` | Remove product type and product-linked fields where no longer needed |
| `/src/components/DealForm.tsx` | `Plano` select and plan-price suggestion | Remove product selector + suggestion logic |
| `/src/components/KanbanBoard.tsx` | Card renders product name (`getProductName`) | Remove product line in cards and product helper dependency |
| `/src/app/api/db/products/route.ts` | Product CRUD endpoint | Delete route or return `410 Gone` during transition, then remove |
| `/src/app/api/entities/products/route.ts` | Product CRUD endpoint (parallel API family) | Delete route or return `410 Gone`, then remove |
| `/src/app/api/db/deals/route.ts` | Deal transform/create/update include product fields | Remove product mapping from deal API contract |
| `/src/app/api/entities/deals/route.ts` | Deal payload includes `productId/productIds` | Remove product fields and related validations |
| `/src/lib/db/operations.ts` | Product CRUD, seed uses `INITIAL_PRODUCTS`, deal `product_ids` handling | Remove product operations + remove product columns from runtime mapping |
| `/src/lib/db/client.ts` | Creates `products` table and product FKs | Remove product table/FKs in canonical schema path; keep migration-safe handling |
| `/src/constants/index.ts` | Seeds `INITIAL_PRODUCTS` and product-linked deals | Delete product seed data; decouple deals from products |
| `/scripts/seed-db.ts` | Seeds/uses products and product-linked deals | Remove product seed block and product fields in deals |
| `/scripts/seed-db-new.ts` | Seeds/uses products and product-linked deals | Remove product seed block and product fields in deals |
| `/src/app/api/seed/route.ts` | Creates products in seed endpoint | Remove product seed and result entry |

---

## Schema Migration Plan

Goal: one canonical identity/tenant model using company membership roles only.

### Canonical role and company relationship
- Canonical role location: `memberships.role` with enum `OWNER | MANAGER | COLLABORATOR`.
- Canonical company relationship: `memberships(company_id,user_id)`.
- `users` becomes identity-only (`id,email,password_hash,full_name,is_active`) and no business role.

### Required schema hardening
1. Keep and enforce (already present):
   - `memberships.role` CHECK (`OWNER`,`MANAGER`,`COLLABORATOR`)
   - `team_members` relation to memberships
   - `manager_scopes` relation to memberships/PDV/team
2. Add manager binding hard rules (migration DDL)
   - Enforce manager has exactly one PDV scope OR add `memberships.pdv_id` and enforce `MANAGER` must have non-null PDV binding.
   - Prefer deterministic binding for query simplicity and stability.
3. Lead ownership consistency
   - Keep `leads.owner_membership_id` required.
   - Ensure all write paths set owner membership explicitly.
4. Legacy to canonical migration
   - Migrate old `users.role`, `users.tenant_id`, `users.pdv_id` to `memberships` + manager scope records.
   - Deprecate legacy tables/columns from app runtime after cutover.

### Data migration notes
- Existing helper: `/scripts/migrate-legacy-auth-data.ts` already maps `ADMIN->OWNER`, `MANAGER->MANAGER`, others -> `COLLABORATOR`.
- Extend this migration to include PDV/team scope migration and cleanup checks.

---

## Step-by-Step Implementation

- [ ] Step 1: Data Purge (Seeds & DB Cleanup).
  - Remove all default seeds except pipeline stages.
  - Purge `INITIAL_PRODUCTS` and product-linked seed payloads from:
    - `/src/constants/index.ts`
    - `/src/lib/db/operations.ts` seed path
    - `/src/app/api/seed/route.ts`
    - `/scripts/seed-db.ts`
    - `/scripts/seed-db-new.ts`
  - Keep stage bootstrap in signup (`/src/lib/domain/onboarding/signup.service.ts`) as canonical default seed.

- [ ] Step 2: Feature Removal (Pendencias, Planos, Validacao).
  - Remove Pendencias badge and overdue logic from:
    - `/src/app/page.tsx`
    - `/src/components/layout/MainHeader.tsx`
    - Any sidebar badge paths tied to validation counts
  - Remove Planos/Produtos feature end-to-end:
    - Navigation + products view + product context/api/types
    - Deal product mapping fields and UI selectors
  - Remove legacy Validacao de Vendas module:
    - UI: `ValidatorDashboard`, `ValidationModal`, `SaleSubmissionForm`, `InstallmentGrid`
    - API: `/api/db/sales/*` and migration route
    - state/service/type references in `CRMContext` and `services/api.ts`
  - Kanban cleanup:
    - remove `Plano` display
    - remove `Proximo contato` field and dependent badge/count logic

- [ ] Step 3: Auth Refactor (Signup at /login & Role logic).
  - Make `/login` the single auth entrypoint with two flows:
    - Sign in (owner/collaborator)
    - Company creation (self-service signup)
  - Keep signup backend at `/api/public/signup`, but invoke it from `/login` and auto sign-in via NextAuth credentials.
  - Consolidate to NextAuth session contract (`companyId`, `membershipId`, `role`).
  - Decommission legacy custom JWT login/me/refresh/logout usage in UI and data-fetch hooks.
  - Update middleware/public routes accordingly (`/login` + public APIs only).

- [ ] Step 4: RBAC Engine (Global filters for Kanban/Dashboard based on Role/PDV).
  - Centralize role rules in `/src/lib/auth/rbac.ts` and remove fallback TODO behavior.
  - Role behavior target:
    - OWNER: full company access.
    - MANAGER: access all leads in manager PDV (own + team members in same PDV); can assign leads.
    - COLLABORATOR: only leads assigned/owned by own membership.
  - Apply same scope rules across:
    - Leads API + domain services
    - Dashboard API and queries
    - Consorciados API and list filters
  - Enforce role guards on PDV/Team mutation routes.

- [ ] Step 5: UI/Sidebar Overhaul.
  - Remove user-selection dropdown/emulation from sidebar and root app.
  - Sidebar must reflect actual logged-in role only.
  - Remove obsolete nav items (`Planos`, `Validacao de Vendas`) globally.
  - Ensure dashboard/kanban/consorciados pages render data already filtered by backend RBAC.
  - Keep a consistent route shell (avoid mixed old/new page layouts).

---

## Verification Rules (stability-focused)

### Must-pass role behavior checks
1. Manager sees team leads in same PDV
   - Given manager `M1` tied to `PDV-A`
   - Given collaborator `C1` in `PDV-A` and collaborator `C2` in `PDV-B`
   - Given leads owned by `M1`, `C1`, and `C2`
   - When `M1` lists leads
   - Then response includes `M1 + C1` leads and excludes `C2` leads.

2. Collaborator restriction
   - Given collaborator `C1`
   - When `C1` lists leads
   - Then only leads assigned/owned by `C1` are returned.
   - When `C1` requests a foreign lead detail/update
   - Then API returns `403`.

### API-level verification
- `/api/leads` enforces owner/manager/collaborator visibility correctly.
- PDV/team management routes reject unauthorized roles.
- Lead assignment endpoint (or lead update with ownership change) is blocked for collaborator and allowed for manager/owner with scope checks.

### UI-level verification
- No user-switch dropdown in sidebar.
- No `Planos` tab, no `Validacao de Vendas` tab, no pendencias badge.
- Kanban cards/forms do not show `Plano` or `Proximo contato`.
- Dashboard, Kanban, Consorciados all display data consistent with role.

### Test suite updates to include
- Extend unit RBAC tests:
  - `/tests/unit/auth/rbac.spec.ts`
  - `/tests/unit/auth/scope-resolution.spec.ts`
- Add/extend e2e role-visibility coverage:
  - `/tests/e2e/rbac-visibility.spec.ts`
- Replace/remove legacy sales validation e2e path:
  - `/tests/e2e/sales-flow-consistency.spec.ts` -> migrate to lead-role visibility scenarios.

### Release gate
- Lint clean
- Build clean
- RBAC unit + integration + e2e scenarios pass for:
  - owner full access
  - manager PDV/team visibility and assignment
  - collaborator strict isolation
