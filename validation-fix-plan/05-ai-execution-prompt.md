# AI Execution Prompt (Copy/Paste)

Use this prompt with an implementation AI.

---

You are working in this repository and must fix the validation visibility bug.

## Objective

When a sale is flagged as having pending validation problems, the UI must always show explicit issue messages. No more states where status says there is a problem but issue list is empty/hidden.

## Constraints

- Do not change business behavior outside validation flow.
- Keep existing status machine (`AWAITING_CONSISTENCY`, `CONSISTENT`, `INCONSISTENT`).
- Implement robust error visibility in modal and API client.

## Required files to read first

- `validation-fix-plan/README.md`
- `validation-fix-plan/01-system-map.md`
- `validation-fix-plan/02-debug-playbook.md`
- `validation-fix-plan/03-implementation-plan.md`
- `validation-fix-plan/04-test-matrix.md`

## Required implementation tasks

1. Add a shared validation normalization helper that derives:
   - `hasPendingIssues`
   - `pendingIssues[]` from `validationNotes`
2. Update all sales API mappers (`sales`, `sales/validate`, `sales/installments`) to return those fields.
3. Update frontend `Sale` type with new fields.
4. Update `ValidatorDashboard` to render `pendingIssues` as a list with fallback message.
5. Improve filter UX so hidden results are obvious and clearable.
6. Update `ApiClient.request` to throw backend `error` message from JSON body.
7. Change validation context call from fire-and-forget mutate to async mutation and propagate failures.
8. Update `ValidationModal` to show inline error and close only on success.

## Verification steps (must run)

1. Run lint.
2. Run build.
3. Execute the manual test matrix in `validation-fix-plan/04-test-matrix.md`.

## Deliverables

- Code changes.
- Short summary of root cause and fix.
- Confirmation for each acceptance checkbox in `04-test-matrix.md`.

---

If you find schema-level persistence for `has_pending_issues` is truly required by product, propose it as Phase 2 after shipping API-level computed fields first.
