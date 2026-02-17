# Implementation Plan (Detailed)

This is the execution plan to make pending validation reasons always visible and understandable.

## Phase 0 - Define canonical contract

Target API-facing shape for each sale:

```ts
interface SaleValidationView {
  consistencyStatus: 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT';
  validationNotes: string | null;
  hasPendingIssues: boolean;
  pendingIssues: string[];
}
```

Recommended semantics:

- `hasPendingIssues`:
  - `true` when `consistencyStatus === 'INCONSISTENT'`
  - `false` otherwise
- `pendingIssues`:
  - parsed from `validationNotes` as line/bullet list
  - when inconsistent and empty, return one fallback message:
    - `"Pending issue exists but was not detailed by validator."`

This guarantees that if the status says there is a problem, the UI always has something explicit to render.

## Phase 1 - Backend normalization

### 1.1 Create a single normalization helper

Add a shared helper in a reusable file (example path: `src/lib/sales/validation.ts`):

- `parsePendingIssues(validationNotes: string | null): string[]`
  - split by newline
  - trim each item
  - remove empty items
  - normalize optional bullet prefixes (`-`, `*`, numbered prefixes)
- `deriveHasPendingIssues(status): boolean`
- `buildPendingIssues(status, validationNotes): string[]`
  - parse notes
  - if status is inconsistent and parsed list empty -> fallback array with one message

### 1.2 Add fields in API response mappers

Update all sale mappers to include the derived fields:

- `src/app/api/db/sales/route.ts`
- `src/app/api/db/sales/validate/route.ts`
- `src/app/api/db/sales/installments/route.ts`

Important: there are currently 3 duplicated `transformSaleToComponent(...)` functions. Either:

- Option A (recommended): move to one shared mapper and import in all 3 routes.
- Option B: update all 3 in sync (higher risk).

### 1.3 Keep notes integrity

In `src/app/api/db/sales/validate/route.ts`:

- Keep `INCONSISTENT` notes requirement.
- Trim notes before persisting (`String(notes || '').trim()`).

In `src/lib/db/operations.ts` (`validateSale`):

- persist already-trimmed value.

Optional one-time data fix (if existing rows have empty notes with inconsistent status):

- migration script/update query to backfill a default note.

## Phase 2 - Frontend data contract and rendering

### 2.1 Extend frontend types

Update `src/types/index.ts` `Sale` interface to include:

- `hasPendingIssues: boolean`
- `pendingIssues: string[]`

If keeping backward compatibility, mark temporarily optional during rollout then make required.

### 2.2 Render issues explicitly in dashboard

Update `src/components/ValidatorDashboard.tsx`:

- Replace current single-note block condition:
  - from `sale.consistencyStatus === 'INCONSISTENT' && sale.validationNotes`
  - to a condition based on `sale.hasPendingIssues || sale.consistencyStatus === 'INCONSISTENT'`
- Render:
  - title: `Pending issues`
  - `<ul>` from `sale.pendingIssues`
  - include safe fallback item when empty
- Keep `validationNotes` visible as raw text only if needed for debugging, otherwise rely on normalized list.

### 2.3 Make filter state explicit (avoid hidden list confusion)

Still in `ValidatorDashboard`:

- Add a visible `Clear filters` action.
- Add a small info line when filters/search are active and hiding results.

This addresses the case "badge says pending exists, but list looks empty".

## Phase 3 - Mutation and error handling improvements

### 3.1 Preserve backend error messages in API client

Update `src/services/api.ts` `ApiClient.request(...)`:

- On non-2xx, attempt to parse JSON body.
- Throw `Error(body.error || body.message || fallbackStatusMessage)`.

### 3.2 Use async mutation return in context

Update `src/context/CRMContext.tsx`:

- Change `validateSale` provider method to use `validateSaleMutation.mutateAsync(...)`.
- Update context type signature to return `Promise<void>` (or returned payload).

### 3.3 Show validation failures in modal

Update `src/components/ValidationModal.tsx`:

- Add local `errorMessage` state.
- In `handleValidate`, catch errors and display inline alert text.
- Only close modal on success.
- Keep loading states on action buttons.

This removes silent failure and makes backend validation feedback visible.

## Phase 4 - Optional schema hardening (if product needs first-class fields)

If business explicitly wants `has_pending_issues` and `pending_issues` persisted in DB, do this in a second pass:

1. Add columns to `sales`:
   - `has_pending_issues` (`INTEGER`/boolean)
   - `pending_issues` (`TEXT` JSON array)
2. Update DB type (`src/types/db/index.ts`).
3. Update create/validate/update operations.
4. Keep API mapper contract unchanged.

If not required, computed fields in API are enough and lower risk.

## Phase 5 - Regression safety and completion

After implementation:

1. Run lint.
2. Run build.
3. Execute focused manual validation flow (see test matrix file).
4. Confirm no route returns sales missing the new fields.

Definition of done:

- Whenever UI indicates pending/inconsistent state, at least one explicit reason is visible.
- Validation request failures surface meaningful messages.
- No more "error exists but list is empty" state.
