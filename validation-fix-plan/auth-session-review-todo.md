# Auth/Session Migration Review TODO

Date: 2026-02-16
Status: Open

## Context

This report captures confirmed issues found during the uncommitted auth/session migration review and maps each issue to a concrete TODO in code.

## Priority Matrix

### P0 (High)

- [ ] Fix current-user bootstrap endpoint to avoid double `/api` prefix.
  - `src/hooks/useCurrentUser.ts:11`
  - `src/services/api.ts:19`
- [ ] Align `/api/me` response contract with current frontend expectations (or migrate frontend to new session contract end-to-end).
  - `src/app/api/me/route.ts:12`
  - `src/context/CRMContext.tsx:156`
- [ ] Add RBAC enforcement to PDV mutations (`POST`/`PATCH`).
  - `src/app/api/pdvs/route.ts:16`
  - `src/app/api/pdvs/route.ts:32`
- [ ] Add RBAC enforcement to Team mutations (`POST`/`PATCH`).
  - `src/app/api/teams/route.ts:16`
  - `src/app/api/teams/route.ts:32`
- [ ] Fix lead RBAC visibility mismatch for roles beyond OWNER/COLLABORATOR/MANAGER.
  - `src/lib/auth/rbac.ts:28`
  - `src/lib/auth/rbac.ts:58`
- [ ] Add explicit deny in `assertCanCreateLead` for unhandled roles.
  - `src/lib/auth/rbac.ts:78`

### P1 (Medium)

- [ ] Make `force=true` path reachable in seed route (remove early dead-return behavior).
  - `src/app/api/seed/route.ts:25`
- [ ] Restore sidebar navigation behavior on route pages using noop `onViewChange`.
  - `src/app/leads/page.tsx:109`
  - `src/app/settings/page.tsx:38`
  - `src/components/layout/MainSidebar.tsx:40`

## Recommended Execution Order

1. Fix `/api/me` URL + contract mismatch (`useCurrentUser` + `/api/me` + consumer guards).
2. Apply RBAC hardening (`pdvs`, `teams`, `rbac.ts`).
3. Fix seed `force` flow.
4. Fix navigation callback behavior in route pages.
5. Run validation (`npm run lint`) and then targeted manual smoke checks.

## Validation Checklist

- [ ] Authenticated user loads app without redirect loop.
- [ ] Sales queries execute when authenticated user is present.
- [ ] OWNER/ADMIN/MANAGER/COLLABORATOR visibility for leads matches policy.
- [ ] Unauthorized roles cannot mutate PDVs/Teams.
- [ ] Seed works with `force=true` when tenant already has data.
- [ ] Sidebar navigation works from `/leads` and `/settings`.
