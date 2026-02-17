# System Map: Current Validation Flow

## 1) Data model

Current sale validation data in DB (`sales` table):

- `consistency_status` (`AWAITING_CONSISTENCY | CONSISTENT | INCONSISTENT`)
- `validation_notes` (`TEXT | NULL`)
- `validated_by`, `validated_at`

Defined in:

- `src/lib/db/client.ts`
- `src/app/api/db/migrate-sales/route.ts`

## 2) Backend state transitions

### Create sale

- Function: `createSale(...)`
- File: `src/lib/db/operations.ts`
- Behavior: new sales start at `AWAITING_CONSISTENCY`.

### Validate sale

- Function: `validateSale(id, validatorId, status, notes)`
- File: `src/lib/db/operations.ts`
- Behavior:
  - sets `consistency_status`
  - writes `validation_notes`
  - sets `validated_by`, `validated_at`

### Re-submit inconsistent sale

- Function: `updateSale(...)`
- File: `src/lib/db/operations.ts`
- Behavior when existing status is `INCONSISTENT`:
  - sets status back to `AWAITING_CONSISTENCY`
  - clears `validated_by`, `validated_at`, `validation_notes`

## 3) Backend API payload flow

### Read/list sales

- Route: `src/app/api/db/sales/route.ts`
- Mapper: `transformSaleToComponent(...)`
- Output includes `consistencyStatus` and `validationNotes`.

### Validate sale

- Route: `src/app/api/db/sales/validate/route.ts`
- Notes are required when `status === INCONSISTENT`.
- Returns `{ success: true, sale: ... }`.

### Update installments

- Route: `src/app/api/db/sales/installments/route.ts`
- Not central to issue list rendering, but reuses sale mapper.

### Count pending items

- Endpoint: `/api/db/sales?counts=true`
- Backend functions:
  - `getSalesCountByStatus(...)`
  - `getSalesCountByStatusForSeller(...)`

## 4) Frontend flow

### Fetch and cache

- API client: `src/services/api.ts`
  - `salesApi.getAll()`
  - `salesApi.getCounts()`
  - `salesApi.validate()`

- Context: `src/context/CRMContext.tsx`
  - Query keys: `['sales']`, `['sales-counts']`
  - Mutation: `validateSaleMutation`

### Compute pending badge

- File: `src/app/page.tsx`
- Logic: `pendingSalesCount = salesCounts?.AWAITING_CONSISTENCY || 0`

### Render issue reason(s)

- File: `src/components/ValidatorDashboard.tsx`
- Current render condition:
  - show reason block only when `sale.consistencyStatus === 'INCONSISTENT' && sale.validationNotes`

### Submit inconsistent reason

- File: `src/components/ValidationModal.tsx`
- User types `notes` in textarea and clicks `Inconsistente`.

## 5) Practical mapping to requested terminology

If product/business uses names like `has_pending_issues` and `pending_issues`, today the nearest equivalents are:

- `has_pending_issues` ~= `consistencyStatus === 'INCONSISTENT'` (or generally not `CONSISTENT`, depending on business meaning)
- `pending_issues` ~= parsed/structured content from `validationNotes` (currently only a single text field)

This mismatch (boolean/state vs structured list) is the core reason users can see "there is a pending problem" but no clear list.
