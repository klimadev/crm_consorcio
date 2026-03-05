# AI Execution Playbook (Step-by-Step)

## Usage
- This playbook is designed so an AI agent can execute reduction safely in phases.
- Do not skip validation gates between phases.

## Phase 0 - Baseline snapshot
1. Capture baseline metrics:
   - file count
   - token estimate
   - lint/build/test status
2. Save baseline report in `dx-reduction-plan/baseline-report.md`.

## Phase 1 - Dead file and wrapper cleanup
1. Delete high-confidence dead files from `02-file-matrix.md` section A.1.
2. Remove 1-line module wrappers and update dashboard imports.
3. Remove unused `normalizaTelefoneParaWhatsapp` from `src/lib/utils.ts`.
4. Validation gate:
   - run lint
   - run build
   - run test
5. If any failure: fix only related breakages from deleted files and re-run full gate.

## Phase 2 - Shared UI primitives
1. Create shared components:
   - `module-page-shell.tsx`
   - `module-page-header.tsx`
   - `inline-status-alert.tsx`
   - optional `access-denied-card.tsx`
2. Migrate Configs + WhatsApp headers first.
3. Migrate repeated inline error blocks.
4. Update Kanban header shell (controls remain unchanged initially).
5. Delete obsolete module header/alert files.
6. Validation gate:
   - lint/build/test
   - visual smoke on `/configs`, `/whatsapp`, `/kanban`, `/equipe`

## Phase 3 - Equipe decomposition
1. Split `use-equipe-module.ts` into focused hooks as defined in `04-hook-refactor.md`.
2. Split `pdv-management-panel.tsx` into subcomponents.
3. Keep `useEquipeModule` public API stable first (adapter layer allowed).
4. Validation gate:
   - lint/build/test
   - manual flow checks:
     - filtros + URL sync
     - editar colaborador/autosave
     - inativacao individual/lote
     - PDV CRUD and assignment

## Phase 4 - Kanban decomposition
1. Split `use-kanban-module.ts` by concern.
2. Split `lead-details-drawer.tsx` and `kanban-header.tsx` into focused pieces.
3. Keep behavioral parity:
   - drag/drop
   - perda dialog
   - autosave details
   - chat tab integration
4. Validation gate:
   - lint/build/test
   - manual flow checks on lead lifecycle.

## Phase 5 - API abstraction migration
1. Implement `src/lib/api/*` helpers.
2. Migrate routes by groups A -> D from `05-api-abstractions.md`.
3. Remove duplicated `pendencias/permissoes.ts`.
4. Validation gate:
   - lint/build/test
   - execute API route tests
   - quick manual auth and permission checks.

## Phase 6 - Conditional route pruning
1. Confirm usage of conditional routes (frontend, tests, external integrations).
2. Delete only routes with verified no callers.
3. Validation gate:
   - lint/build/test
   - integration check for scheduler/internal endpoints.

## Phase 7 - Dependency cleanup
1. Remove unused dependencies from `package.json`:
   - `next-auth`
   - `react-hook-form`
   - `@hookform/resolvers`
2. Install cleanly and ensure lockfile consistency.
3. Final validation gate:
   - lint/build/test

## Phase 8 - Final report
1. Produce `dx-reduction-plan/final-reduction-report.md` with:
   - before/after file count
   - before/after token estimate
   - deleted files list
   - merged files list
   - any intentional tradeoffs
2. Include follow-up suggestions for next token reduction wave.

## Guardrails for visual quality
- Do not flatten module visuals into generic cards.
- Preserve meaningful gradients, iconography, hierarchy, and interaction affordances.
- Preserve loading states and optimistic feedback UX.

## Guardrails for business behavior
- Keep strict RBAC logic and tenant boundaries.
- Keep pendencias dynamic calculation behavior unchanged.
- Keep WhatsApp automation idempotency and cancellation semantics.
