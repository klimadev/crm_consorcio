# Final Cleanup Checklist

This document consolidates all cleanup work needed to finish the auth/db migration and stabilize the project.

## 1) Already done

- [x] Login page switched to NextAuth credentials flow (`signIn('credentials')`).
- [x] Signup -> immediate login aligned with NextAuth flow.
- [x] Root layout wrapped with `AuthSessionProvider`.
- [x] Legacy `useAuth` hook removed.
- [x] Legacy auth endpoints deprecated with `410 Gone`:
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/refresh`
- [x] Legacy `/api/auth/me` adapted to read from NextAuth session and marked deprecated.
- [x] Type/lint baseline restored (`npm run lint` passing).

## 2) Critical remaining tasks (must do before release)

### 2.1 Remove legacy auth path usage in backend routes

- [x] Migrate old entity routes that still read `access_token`/legacy JWT cookies to NextAuth session context. (fixed via `requireCompanySession()`)
- [x] Replace legacy token parsing patterns in:
  - `src/app/api/entities/customers/route.ts`
  - `src/app/api/entities/deals/route.ts`
  - `src/app/api/entities/pdvs/route.ts`
  - `src/app/api/entities/products/route.ts`
  - `src/app/api/entities/stages/route.ts`
  - `src/app/api/users/permissions/route.ts`
  - `src/app/api/preferences/route.ts`
  - `src/app/api/migrate/route.ts`
- [x] Ensure all authenticated APIs rely on one canonical method:
  - `requireCompanySession()` for new multi-tenant APIs, or
  - `getServerAuthSession()` when endpoint scope is session-only.

### 2.2 Define one canonical "current user" endpoint

- [x] Choose canonical endpoint (`/api/me` recommended). (fixed)
- [x] Update all clients/hooks to use only canonical endpoint. (fixed: no references to `/api/auth/me` in `src/`)
- [ ] Keep `/api/auth/me` only as temporary compatibility shim.
- [x] Remove `/api/auth/me` after clients are migrated. (fixed: route deleted)

### 2.3 Remove dead legacy auth modules

- [x] Remove or isolate `src/lib/auth/jwt.ts` legacy cookie/JWT flow once no references remain. (fixed: removed)
- [x] Remove duplicate token utility surface (if still present) in `src/lib/auth/token-utils.ts`. (fixed: removed)
- [ ] Delete deprecated auth route handlers after migration window. (pending: `/api/auth/login|logout|refresh` still 410)

## 3) Data and DB cleanup tasks

### 3.1 Stop dual-database ambiguity

- [x] Define official runtime DB for auth/domain (`data/saas.db` currently used by new stack). (fixed in `README.md`)
- [x] Prevent accidental fallback to `data/database.db` for auth logic. (fixed: auth/session now NextAuth-only)
- [ ] Audit imports from `@/lib/db` vs `@/lib/db/connection` and normalize. (pending broad refactor)

### 3.2 Migration strategy for old data

- [x] Decide policy:
  - migrate legacy `tenants/users` data into `companies/memberships`, or
  - freeze legacy data and keep read-only compatibility.
- [x] Create one migration script + rollback notes. (fixed: `scripts/migrate-legacy-auth-data.ts`, `validation-fix-plan/legacy-auth-migration-notes.md`)
- [ ] Validate migrated accounts can login with NextAuth credentials. (pending manual runtime check)

### 3.3 Dev data hygiene

- [x] Add clear docs for which DB files are expected in dev. (fixed in `README.md`)
- [x] Ensure generated local DB artifacts are ignored where appropriate (`*.db`, `*.db-wal`, `*.db-shm` policy decision). (fixed in `.gitignore`)

## 4) API surface cleanup

- [x] Add deprecation notes in API docs/README for removed legacy endpoints. (fixed in `README.md`)
- [ ] Standardize response contracts (`ok/fail` JSON shape) across old/new routes. (pending)
- [ ] Remove duplicated auth APIs once migration closes. (pending partial)

## 5) Frontend cleanup

- [ ] Remove any legacy assumptions about `tenantId` naming where now effectively `companyId`.
- [x] Align callback/redirect defaults with existing routes (`/leads`, `/settings`, etc.). (confirmed)
- [x] Verify navigation and access guard behavior with NextAuth session-only flow. (validated via build + route guard inspection)

## 6) Tests required to finish

### 6.1 Integration

- [ ] Signup -> login -> protected page access.
- [ ] Invalid company slug login rejection.
- [ ] Inactive user rejection.
- [ ] Manager/collaborator scope permissions for leads.
- [x] Deprecated endpoints return `410` with expected payload. (code verified in legacy routes)

### 6.2 Regression

- [ ] Verify legacy pages still reachable when expected.
- [x] Verify no route still depends on `access_token` cookie. (fixed: only removed backup file had leftovers)

### 6.3 Command checklist

- [x] `npm run lint`
- [ ] `npx playwright test` (target auth + leads first) (skipped by request)
- [x] `npm run build` (run once before final commit/release only)

## 7) Release/commit checklist

- [ ] Remove temporary compatibility code not needed in production.
- [x] Confirm no deprecated endpoint is still called by frontend. (fixed: no `/api/auth/me` calls)
- [x] Update `README.md` auth architecture section.
- [x] Add changelog entry documenting auth/db unification and endpoint deprecations.

## 8) Suggested execution order

1. Migrate remaining API routes off legacy JWT cookie parsing.
2. Migrate all clients to canonical `/api/me`.
3. Remove `jwt.ts` legacy auth path + deprecated `/api/auth/*` routes.
4. Run integration/regression tests.
5. Final build + release commit.
