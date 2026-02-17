# Test Matrix and Acceptance Criteria

## Manual scenarios

### Scenario 1: Inconsistent sale with detailed notes

1. Create a sale.
2. Validate as `INCONSISTENT` with multiline notes (one issue per line).
3. Open `INCONSISTENT` tab.

Expected:

- Card shows `Pending issues` section.
- Each note line appears as a separate list item.
- No empty state in the reason block.

### Scenario 2: Inconsistent sale with old/empty notes (legacy row)

1. Use a row where status is inconsistent and notes are empty/null.
2. Open dashboard.

Expected:

- Card still shows one fallback issue item.
- User never sees a blank issue panel for inconsistent state.

### Scenario 3: Validation API rejects request

1. Trigger validation request expected to fail (example: inconsistent without notes).
2. Stay in validation modal.

Expected:

- Modal stays open.
- Inline error shows backend message.
- No silent close, no generic useless status-only error.

### Scenario 4: Badge/list with active filters

1. Ensure pending items exist.
2. Apply search/PDV/seller filters that hide all matching cards.

Expected:

- UI indicates filters are active.
- Clear-filters action is visible.
- Behavior is understandable (no false impression of missing data).

### Scenario 5: Status transition on resubmission

1. Mark sale inconsistent with issues.
2. Edit and save sale.

Expected:

- Status returns to `AWAITING_CONSISTENCY`.
- Previous issue list is cleared from the card (by design).
- No stale issues remain visible after resubmission.

## API contract checks

For every item returned by `GET /api/db/sales`, verify:

- `hasPendingIssues` exists and is boolean.
- `pendingIssues` exists and is array.
- When `hasPendingIssues === true`, `pendingIssues.length >= 1`.

For `POST /api/db/sales/validate` success response, verify same fields are present in returned sale.

## Non-functional checks

- Build passes.
- Lint passes.
- No TypeScript errors for new fields across route, context, and components.

## Quick acceptance checklist

- [ ] Pending/inconsistent state always has visible reason(s).
- [ ] Error feedback is explicit on failed validation actions.
- [ ] Filtered empty state is distinguishable from data-contract failure.
- [ ] API and UI use the same normalized contract.
