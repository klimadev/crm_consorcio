# Debug Playbook (No Code Change Yet)

Use this playbook to isolate exactly where issue data is lost.

## Step 1: Confirm API shape in network

1. Open browser devtools and inspect:
   - `GET /api/db/sales`
   - `GET /api/db/sales?counts=true`
   - `POST /api/db/sales/validate`
2. For each sale in list payload, capture:
   - `id`
   - `consistencyStatus`
   - `validationNotes`
3. Confirm whether any sale has a pending/inconsistent state with missing notes.

Expected findings to classify:

- Case A: `INCONSISTENT` + non-empty `validationNotes` -> data exists, likely UI render condition/filter issue.
- Case B: `INCONSISTENT` + empty/null `validationNotes` -> backend/data issue.
- Case C: badge count > visible cards -> filter mismatch.

## Step 2: Validate count vs list parity

1. In sidebar/header, note pending badge count.
2. In `ValidatorDashboard`, clear search/PDV/seller filters and compare list length.
3. Confirm if mismatch is caused by active filters.

Potential mismatch source:

- Badge is global (`salesCounts`), list is filter-dependent (`filteredSales`).

## Step 3: Verify mutation success/failure visibility

1. Trigger validation with invalid input (for example inconsistent without notes).
2. Observe whether modal shows backend message or closes silently.

Likely current behavior:

- No clear inline error.
- Generic thrown error message (status text only), because API client discards JSON `error` body.

## Step 4: Data audit query (optional)

Run against SQLite to find inconsistent sales with empty reasons:

```sql
SELECT
  id,
  consistency_status,
  validation_notes,
  LENGTH(TRIM(COALESCE(validation_notes, ''))) AS notes_len
FROM sales
WHERE consistency_status = 'INCONSISTENT';
```

And status distribution:

```sql
SELECT consistency_status, COUNT(*)
FROM sales
GROUP BY consistency_status;
```

## Step 5: Confirm routing/permission assumptions

1. Verify role of user reproducing issue.
2. Confirm they can access intended actions:
   - UI check: `ValidatorDashboard` currently only allows validate action for `ADMIN`.
   - API check: `/api/db/sales/validate` currently allows only `ADMIN`.

If product rules require manager validation, this is a separate but related behavior mismatch.

## Step 6: Root cause decision tree

- If API has rich issue info but UI missing -> fix frontend mapping/render.
- If API has status but no issue list -> fix backend contract and data normalization.
- If mutation errors are hidden -> fix client error propagation and async mutation handling.
- If list hidden by filters -> improve UI filter visibility and clear-controls.
