# File Matrix (Actionable)

## Legend
- `DELETE`: remove file.
- `MERGE`: move functionality into target and delete source.
- `CREATE`: new reusable file.
- `UPDATE`: refactor file to consume new abstractions.

## A) Fast cleanup phase

### A.1 Delete candidates (high confidence)
- `DELETE` `src/components/ui/alert.tsx`
- `DELETE` `src/components/ui/drawer.tsx`
- `DELETE` `src/components/ui/empty-state.tsx`
- `DELETE` `src/components/ui/form-field.tsx`
- `DELETE` `src/components/ui/skeleton.tsx`
- `DELETE` `src/components/ui/spinner.tsx`
- `DELETE` `src/modules/onboarding/lib/lifecycle.ts`
- `DELETE` `src/modules/onboarding/steps/dashboard-initial.steps.ts`
- `DELETE` `src/modules/whatsapp/components/automations/automation-stepper.tsx`
- `DELETE` `src/modules/whatsapp/components/automations/followup-timeline-editor.tsx`
- `DELETE` `src/modules/whatsapp/components/automations/variable-chips.tsx`
- `DELETE` `src/modules/kanban/constants.ts`

### A.2 Thin wrappers
- `DELETE` `src/components/modulo-equipe.tsx`
- `DELETE` `src/components/modulo-kanban.tsx`
- `DELETE` `src/components/modulo-configs.tsx`
- `DELETE` `src/components/modulo-whatsapp.tsx`
- `UPDATE` `src/app/(dashboard)/equipe/page.tsx` -> import from `@/modules/equipe`
- `UPDATE` `src/app/(dashboard)/kanban/page.tsx` -> import from `@/modules/kanban`
- `UPDATE` `src/app/(dashboard)/configs/page.tsx` -> import from `@/modules/configs`
- `UPDATE` `src/app/(dashboard)/whatsapp/page.tsx` -> import from `@/modules/whatsapp`

## B) UI consolidation phase

### B.1 Create shared building blocks
- `CREATE` `src/components/shared/module-page-shell.tsx`
- `CREATE` `src/components/shared/module-page-header.tsx`
- `CREATE` `src/components/shared/inline-status-alert.tsx`
- `CREATE` `src/components/shared/access-denied-card.tsx`

### B.2 Merge duplicated module components
- `MERGE` `src/modules/configs/components/configs-header.tsx` -> `module-page-header.tsx`
- `MERGE` `src/modules/whatsapp/components/whatsapp-header.tsx` -> `module-page-header.tsx`
- `UPDATE` `src/modules/kanban/components/kanban-header.tsx` to consume shared header shell.
- `MERGE` `src/modules/configs/components/configs-error-alert.tsx` -> `inline-status-alert.tsx`

### B.3 Page composition updates
- `UPDATE` `src/modules/configs/page.tsx`
- `UPDATE` `src/modules/kanban/page.tsx`
- `UPDATE` `src/modules/whatsapp/page.tsx`
- `UPDATE` `src/modules/equipe/page.tsx`

## C) Hook and state decomposition phase

### C.1 Equipe module
- `CREATE` `src/modules/equipe/hooks/use-equipe-filtros.ts`
- `CREATE` `src/modules/equipe/hooks/use-equipe-lista.ts`
- `CREATE` `src/modules/equipe/hooks/use-pdv-management.ts`
- `CREATE` `src/modules/equipe/hooks/use-funcionario-edicao.ts`
- `CREATE` `src/modules/equipe/hooks/use-funcionario-inativacao.ts`
- `CREATE` `src/modules/equipe/hooks/use-equipe-lote.ts`
- `UPDATE` `src/modules/equipe/hooks/use-equipe-module.ts` (orchestrator only)

### C.2 Kanban module
- `CREATE` `src/modules/kanban/hooks/use-kanban-dados.ts`
- `CREATE` `src/modules/kanban/hooks/use-kanban-filtros.ts`
- `CREATE` `src/modules/kanban/hooks/use-kanban-movimentacao.ts`
- `CREATE` `src/modules/kanban/hooks/use-kanban-criacao-lead.ts`
- `CREATE` `src/modules/kanban/hooks/use-lead-details-autosave.ts`
- `CREATE` `src/modules/kanban/hooks/use-kanban-whatsapp-sync.ts`
- `UPDATE` `src/modules/kanban/hooks/use-kanban-module.ts` (composition only)

### C.3 Shared request helpers for hooks
- `CREATE` `src/lib/hooks/use-async-action.ts`
- `CREATE` `src/lib/hooks/use-optimistic-mutation.ts`
- `CREATE` `src/lib/hooks/use-polling-resource.ts`
- `CREATE` `src/lib/hooks/use-url-state.ts`

## D) API abstraction phase

### D.1 Route helper creation
- `CREATE` `src/lib/api/http.ts`
- `CREATE` `src/lib/api/route-guards.ts`
- `CREATE` `src/lib/api/route-validation.ts`
- `CREATE` `src/lib/api/route-errors.ts`

### D.2 Route migration
- `UPDATE` all `src/app/api/**/route.ts` files to use shared helpers.
- `MERGE` `src/app/api/pendencias/permissoes.ts` -> `src/lib/permissoes.ts`
- `DELETE` `src/app/api/pendencias/permissoes.ts`

## E) Conditional deletions (requires usage verification)
- `DELETE?` `src/app/api/whatsapp/agendamentos/retry/route.ts`
- `DELETE?` `src/app/api/pendencias/[id]/route.ts`
- `DELETE?` `src/app/api/pendencias/lead/[leadId]/route.ts`
- `DELETE?` `src/app/api/internal/whatsapp/follow-up/dispatch/route.ts`

## F) Dependency cleanup
- `UPDATE` `package.json` (remove unused after final grep + green build):
  - `next-auth`
  - `react-hook-form`
  - `@hookform/resolvers`
