# Audit Findings

## 1) Clear redundancy clusters

### 1.1 Module header duplication
- Identical or near-identical header shell appears in:
  - `src/modules/configs/components/configs-header.tsx`
  - `src/modules/whatsapp/components/whatsapp-header.tsx`
  - `src/modules/kanban/components/kanban-header.tsx` (same structural shell, plus extra controls)
- Repeated patterns:
  - Rounded container + border + shadow + icon block + title/subtitle.

### 1.2 Repeated page shell container
- Same section wrapper style repeated in:
  - `src/modules/configs/page.tsx`
  - `src/modules/kanban/page.tsx`
  - `src/modules/whatsapp/page.tsx`

### 1.3 Repeated inline alert blocks
- Same error alert visual block repeated in:
  - `src/modules/equipe/page.tsx`
  - `src/modules/whatsapp/page.tsx`
  - `src/modules/configs/components/configs-error-alert.tsx`

### 1.4 API route boilerplate repetition
- Across many `src/app/api/**/route.ts` files:
  - `const auth = await exigirSessao(request); if (auth.erro) return auth.erro;`
  - `schema.safeParse(...)` + `mensagemErroValidacao(...)` + `NextResponse.json(..., { status: 400 })`
  - repetitive `try/catch` response normalization.

### 1.5 Duplicate auth helper implementation
- `src/app/api/pendencias/permissoes.ts` duplicates session guard logic already present in `src/lib/permissoes.ts`.

## 2) God-files and token hotspots

### 2.1 High-size hook and component files
- `src/modules/equipe/hooks/use-equipe-module.ts` (~1034 lines)
- `src/modules/equipe/components/pdv-management-panel.tsx` (~894 lines)
- `src/modules/kanban/components/lead-details-drawer.tsx` (~665 lines)
- `src/modules/kanban/hooks/use-kanban-module.ts` (~612 lines)
- `src/modules/kanban/components/kanban-header.tsx` (~364 lines)
- `src/modules/whatsapp/components/instances-list.tsx` (~448 lines)
- `src/modules/kanban/hooks/use-pendencias-globais.tsx` (~415 lines)
- `src/lib/whatsapp-chat.ts` (~443 lines)

### 2.2 Symptoms
- UI state + domain state + API requests + timers + validation in single files.
- Difficult local reasoning and high edit risk.
- Repeated fetch/error parsing patterns across modules.

## 3) Strong deletion candidates (no active references)

### 3.1 UI primitives with zero import usage
- `src/components/ui/alert.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/form-field.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/spinner.tsx`

### 3.2 Onboarding dead files
- `src/modules/onboarding/lib/lifecycle.ts`
- `src/modules/onboarding/steps/dashboard-initial.steps.ts`

### 3.3 WhatsApp automations dead files
- `src/modules/whatsapp/components/automations/automation-stepper.tsx`
- `src/modules/whatsapp/components/automations/followup-timeline-editor.tsx`
- `src/modules/whatsapp/components/automations/variable-chips.tsx`

### 3.4 Misc dead/low-value files
- `src/modules/kanban/constants.ts` (not used by imports)
- `src/lib/utils.ts` function `normalizaTelefoneParaWhatsapp` (unused)

## 4) Thin wrapper bloat
- 1-line wrappers that can be removed:
  - `src/components/modulo-equipe.tsx`
  - `src/components/modulo-kanban.tsx`
  - `src/components/modulo-configs.tsx`
  - `src/components/modulo-whatsapp.tsx`
- Dashboard pages can import modules directly.

## 5) Dependency-level redundancy candidates
- Dependencies present but no code references detected:
  - `next-auth`
  - `react-hook-form`
  - `@hookform/resolvers`

## 6) Risk notes before deletion
- Route deletion must be validated by frontend and tests, especially:
  - `src/app/api/whatsapp/agendamentos/retry/route.ts`
  - `src/app/api/pendencias/[id]/route.ts`
  - `src/app/api/pendencias/lead/[leadId]/route.ts`
  - `src/app/api/internal/whatsapp/follow-up/dispatch/route.ts` (may be external scheduler integration)

## 7) High ROI summary
- Biggest ROI = split 3 God files first:
  1) `use-equipe-module.ts`
  2) `use-kanban-module.ts`
  3) `pdv-management-panel.tsx`
- Combined with dead-file cleanup + header/shell unification, this should produce the largest token reduction without feature loss.
