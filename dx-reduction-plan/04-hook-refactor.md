# God-Hook Refactor Strategy

## Objective
- Split oversized hooks into reusable, composable hooks while preserving module orchestration pattern (`const vm = use*Module()`).

## 1) Standard hook architecture

### 1.1 Pattern
- Keep `use<Module>Module` as orchestrator only.
- Move internal responsibilities to focused hooks:
  - `state` hooks: ui-only local state.
  - `query` hooks: fetch/load/poll data.
  - `mutation` hooks: create/update/delete actions.
  - `selectors` hooks: expensive derives/useMemo.
  - `effects` hooks: keyboard handlers, beforeunload, timers.

### 1.2 Rule of thumb
- Max size target per hook file: `~120-220 lines`.
- If a hook exceeds 250 lines, split by responsibility.

## 2) Equipe module split

### 2.1 Current pain
- `use-equipe-module.ts` mixes filters, URL sync, polling, CRUD, autosave, inativacao, lote, and drawer/dialog state.

### 2.2 Proposed decomposition
- `use-equipe-filtros.ts`
  - URL param sync (`busca`, `status`, `cargo`, `id_pdv`, ordenacao, paginacao).
- `use-equipe-lista.ts`
  - Carregar funcionarios + paginacao + kpis.
- `use-pdv-management.ts`
  - CRUD de PDV + instancia association.
- `use-funcionario-edicao.ts`
  - edit state, validation, autosave timers, snapshot/undo.
- `use-funcionario-inativacao.ts`
  - inativacao flow + destination validation + dialogs.
- `use-equipe-lote.ts`
  - selected ids + batch action payloads + execution.
- `use-equipe-module.ts`
  - compose all above into VM return object.

### 2.3 Component split companion
- `pdv-management-panel.tsx` should be split into:
  - `pdv-cards-grid.tsx`
  - `pdv-create-sheet.tsx`
  - `pdv-edit-inline.tsx`
  - `pdv-colaboradores-drawer.tsx`
  - `pdv-colaboradores-list.tsx`
  - `pdv-lote-actions.tsx`

## 3) Kanban module split

### 3.1 Current pain
- `use-kanban-module.ts` handles loading, filters, drag/drop, lead details autosave, uploads, create lead, and WhatsApp sync.

### 3.2 Proposed decomposition
- `use-kanban-dados.ts`
  - bootstrap data (`/api/leads`) and base state.
- `use-kanban-filtros.ts`
  - busca, ordenacao, pendencia filters, derived lead maps.
- `use-kanban-movimentacao.ts`
  - `aoDragEnd`, `moverLead`, perda flow.
- `use-kanban-criacao-lead.ts`
  - create lead dialog state + optimistic create.
- `use-lead-details-autosave.ts`
  - document/url/file upload + autosave behavior.
- `use-kanban-whatsapp-sync.ts`
  - sync state and API call encapsulation.
- `use-kanban-module.ts`
  - orchestrator.

## 4) Shared generic hooks (cross-module)

### 4.1 `use-async-action`
- Standardize loading/error/success for actions.
- Replace repeated `setLoading/try/catch/finally` patterns.

### 4.2 `use-optimistic-mutation`
- API:
  - `applyOptimistic`
  - `commit`
  - `rollback`
- Reuse in leads create/move, instancia create/delete, PDV updates.

### 4.3 `use-polling-resource`
- Standard poll with:
  - visibility-aware throttling
  - optional pause conditions (editing state, unsaved changes)
  - cleanup safety

### 4.4 `use-url-state`
- Encapsulate `useSearchParams` + `router.replace` for list filters.

## 5) VM return simplification
- Current VM return types are huge and noisy.
- Strategy:
  - Group by concern (`filtros`, `lista`, `acoes`, `dialogos`) instead of flat >100 fields.
  - Preserve backward compatibility initially via adapter object.
  - Remove adapter in final cleanup phase.

## 6) Validation for hook refactor
- Unit test focused functions where possible.
- Smoke test each module route manually.
- Ensure no stale closure bugs in timers/effects after split.
- Ensure polling cleanup is always executed on unmount.
