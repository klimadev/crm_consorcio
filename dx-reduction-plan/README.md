# DX Reduction Plan

## Goal
- Reduce file count and token footprint aggressively while preserving all current features and visual quality.
- Keep the existing modular architecture (`src/modules/*`) and Next.js App Router security/validation standards.

## Baseline and Targets
- Baseline (reported): `~180+ files`, `~230k tokens`.
- Target range after refactor:
  - File count: `-25%` to `-40%`.
  - Token count: `-30%` to `-45%`.
  - UI regressions: `0` critical regressions.
  - API behavior regressions: `0` breaking contract changes.

## Priority Order
1. Remove dead files and thin wrappers (fast wins).
2. Consolidate repeated UI shells/headers/alerts.
3. Decompose God-hooks into reusable hooks and service functions.
4. Abstract API route boilerplate (session, validation, errors).
5. Consolidate WhatsApp automation/chat surfaces.
6. Remove now-unused dependencies and run full validation.

## Plan Index
- `01-audit-findings.md`: Architectural redundancies and candidates.
- `02-file-matrix.md`: Exact file-level action map (delete/merge/create/update).
- `03-ui-consolidation.md`: ModulePageHeader and reusable shell strategy.
- `04-hook-refactor.md`: God-hook decomposition into standard reusable patterns.
- `05-api-abstractions.md`: Route utility abstractions and migration sequence.
- `06-execution-playbook.md`: Step-by-step AI execution order with gates.

## Hard Constraints
- Preserve business rules (perfil, tenant scoping, pendencias dynamicas, WhatsApp idempotencia).
- Preserve visual polish, gradients, status chips, and interaction feedback.
- No breaking changes to route contracts unless explicitly listed and versioned.
- Keep Next 15+ async dynamic params pattern and Zod validation coverage.

## Quality Gates (every major phase)
- Lint passes.
- Build passes.
- Tests pass.
- Manual review on:
  - Kanban: drag/drop, lead create/edit/move, pendencias behavior.
  - Equipe: filtering, inativacao, lote, PDV management.
  - WhatsApp: instancia lifecycle, automations CRUD, chat panel.
  - Auth flow: login/cadastro/logout and dashboard access restrictions.
