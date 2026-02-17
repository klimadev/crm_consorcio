# Validation Fix Plan

## Goal

Fix the mismatch where the system indicates pending validation problems but the UI does not clearly show which specific problems exist.

This plan is based on codebase research and is written so another AI can execute it end-to-end.

## What was found

### Validation logic location (backend)

- DB schema for sale validation state is in `src/lib/db/client.ts` (`sales.consistency_status`, `sales.validation_notes`).
- Core validation state transitions are in `src/lib/db/operations.ts`:
  - `validateSale(...)`
  - `updateSale(...)` (resubmission resets `INCONSISTENT` -> `AWAITING_CONSISTENCY` and clears notes)
  - `getSalesCountByStatus(...)`
  - `getSalesCountByStatusForSeller(...)`
- API surface:
  - `src/app/api/db/sales/route.ts` (list + counts)
  - `src/app/api/db/sales/validate/route.ts` (mark consistent/inconsistent)
  - `src/app/api/db/sales/installments/route.ts`

### Validation logic location (frontend)

- API client: `src/services/api.ts` (`salesApi.getAll/getCounts/validate`).
- State layer: `src/context/CRMContext.tsx` (queries + mutations).
- Pending badge count: `src/app/page.tsx` (`salesCounts.AWAITING_CONSISTENCY`).
- Validation list UI: `src/components/ValidatorDashboard.tsx`.
- Validation input modal: `src/components/ValidationModal.tsx`.

### Key disconnects found

1. There is no explicit `has_pending_issues` field in current code.
   - The app currently infers "pending" from status/count (`AWAITING_CONSISTENCY` / `INCONSISTENT`).
2. There is no structured list field for issues.
   - Only one text field exists: `validation_notes` -> `validationNotes`.
3. UI only renders reason when `sale.consistencyStatus === 'INCONSISTENT' && sale.validationNotes`.
   - If notes are missing/empty, user sees status but no reason list.
4. API errors are collapsed into generic errors by `ApiClient.request(...)`.
   - Backend sends useful `error` messages, but frontend throws only `API Error: <status> <statusText>`.
5. `ValidationModal` awaits a non-async context method.
   - Context uses `mutate(...)` (fire-and-forget), not `mutateAsync(...)`.
   - Modal closes before a failing request is surfaced; users get poor feedback.
6. Count/list mismatch can happen with filters.
   - Sidebar badge uses global counts; list uses active search/PDV/seller filters.

## Recommended direction

Make the API contract explicit and stable:

- Add API-level computed fields (or persistent fields, if desired) for:
  - `hasPendingIssues: boolean`
  - `pendingIssues: string[]`
- Keep `validationNotes` for compatibility.
- Render `pendingIssues` in UI as a visible list with fallback text when status indicates pending issues but list is empty.

Implementation details and execution steps are in:

- `validation-fix-plan/01-system-map.md`
- `validation-fix-plan/02-debug-playbook.md`
- `validation-fix-plan/03-implementation-plan.md`
- `validation-fix-plan/04-test-matrix.md`
- `validation-fix-plan/05-ai-execution-prompt.md`
