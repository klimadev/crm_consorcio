# Baseline Report

- Captured at: `2026-03-05T02:01:52.186Z`
- File count (repo, excluding common build/vendor dirs): `277`
- Text-like files counted: `259`
- Token estimate (chars/4 heuristic): `266403`

## Validation Status

- Lint: `PASS` (`npm run lint`)
- Build: `PASS` (`npm run build`)
- Test: `FAIL` (`npm test`)

## Test Failure Notes

- Failing suite: `src/lib/whatsapp-chat.integration.test.ts`
- Failing tests: 4
- Root error: `ECONNREFUSED` on `127.0.0.1:3333` / `::1:3333`
- Cause: integration tests expect an app server on port `3333`, but no persistent server was started.

## Scope Notes

- This baseline was captured before DX reduction implementation.
- Existing failing integration tests are environmental and pre-existing for this execution context.
