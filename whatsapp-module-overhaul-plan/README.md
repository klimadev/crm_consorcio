# WhatsApp Module Overhaul Plan

## Goal

Deliver a full WhatsApp module upgrade with two outcomes:

1. Eliminate duplicate follow-up dispatches caused by race conditions and weak idempotency.
2. Redesign the module to a high-end SaaS UI/UX (dark/light compatible, refined spacing, clear flows).

This document is written as an execution blueprint for an AI coding model.

Important scope decision:

- Do not create a parallel `whatsapp-v2` module.
- Improve the existing WhatsApp module in place, preserving project patterns and current route/module structure.

---

## 1) Current-State Diagnosis (Research Findings)

### 1.1 Backend Dispatch Flow (as-is)

1. Lead stage change endpoint:
   - `src/app/api/leads/[id]/mover/route.ts`
2. Calls automation executor:
   - `src/lib/whatsapp-automations.ts` -> `executarAutomacoesLeadStageChanged`
3. Matches automations and follow-up rules:
   - `src/lib/whatsapp-automations.ts`
4. Schedules jobs in model:
   - `prisma/schema.prisma` -> `WhatsappAutomacaoAgendamento`
5. Dispatch endpoints (manual/internal):
   - `src/app/api/whatsapp/automations/follow-up/dispatch/route.ts`
   - `src/app/api/internal/whatsapp/follow-up/dispatch/route.ts`
6. Dispatcher runner:
   - `src/lib/whatsapp-automations.ts` -> `processarAgendamentosFollowUpWhatsapp`

### 1.2 Root Causes of Duplicate Jobs

1. Unstable idempotency key (`referencia_evento` uses `Date.now()`), so retries create distinct jobs.
2. No no-op guard when moving to the same stage.
3. Lead update + scheduling are not atomically enclosed in one transaction boundary.
4. Dispatcher race: rows are read as `PENDENTE` and only marked later, allowing concurrent workers to send twice.
5. Two dispatch entrypoints can run simultaneously without claim locking.

---

## 2) Target Architecture (Bug Fix)

### 2.1 Idempotency Contract

Use a deterministic key derived from:

- `entity_id` -> `id_lead`
- `stage_id` -> `id_estagio_trigger`
- `automation_id` -> `id_whatsapp_automacao`

For per-step follow-ups, include `id_etapa` in the idempotency key.

Recommended canonical string:

`{id_empresa}:{id_lead}:{id_estagio_trigger}:{id_whatsapp_automacao}:{id_etapa}`

Store as `chave_idempotencia` (raw string or hash).

### 2.2 DB Changes

Update `WhatsappAutomacaoAgendamento` in `prisma/schema.prisma`:

- Add `id_estagio_trigger String`
- Add `chave_idempotencia String`
- Add uniqueness:
  - `@@unique([id_empresa, chave_idempotencia])`

Keep current unique index temporarily during migration, then deprecate old dedupe dependence on `referencia_evento`.

### 2.3 Locking / Claiming for Dispatch

Before sending each job, atomically claim it:

1. Select candidate `PENDENTE` rows.
2. Claim each row using `updateMany(where: { id, status: "PENDENTE" }, data: { status: "PROCESSANDO" })`.
3. Process only when affected row count is `1`.
4. On success: `status = "ENVIADO"`.
5. On failure: `status = "ERRO"` with retry metadata.

Optional Postgres optimization:

- Replace step 1+2 with `FOR UPDATE SKIP LOCKED` claim batches.

### 2.4 Stage No-Op Guard

In `src/app/api/leads/[id]/mover/route.ts`:

- If `lead.estagio.id === id_estagio_destino`, return success/no-op and skip automation scheduling.

---

## 3) Detailed Execution Plan (Backend)

### Phase A - Schema + Migration

1. Edit `prisma/schema.prisma` (`WhatsappAutomacaoAgendamento`).
2. Generate migration adding:
   - new columns
   - unique index on `(id_empresa, chave_idempotencia)`
3. Backfill script (if needed) for existing pending records.
4. Regenerate Prisma client.

Acceptance criteria:

- DB enforces one unique row per idempotency tuple.

### Phase B - Scheduling Refactor

1. In `src/lib/whatsapp-automations.ts`:
   - Build deterministic `chave_idempotencia`.
   - Store `id_estagio_trigger`.
   - Replace upsert key usage from timestamp-driven reference to deterministic key.
2. Preserve backwards compatibility fields during rollout.

Acceptance criteria:

- Repeated same transition creates at most one pending job per automation step.

### Phase C - Stage Change Guard

1. In `src/app/api/leads/[id]/mover/route.ts`:
   - Add same-stage no-op check before update/scheduling.

Acceptance criteria:

- Repeated PATCH to same stage does not enqueue new jobs.

### Phase D - Dispatch Race Fix

1. In `src/lib/whatsapp-automations.ts` dispatcher:
   - Implement claim-lock status transition `PENDENTE -> PROCESSANDO` (atomic).
   - Process only claimed records.
   - Finalize status per result.
2. Ensure both endpoints use the same locked processing function:
   - `src/app/api/whatsapp/automations/follow-up/dispatch/route.ts`
   - `src/app/api/internal/whatsapp/follow-up/dispatch/route.ts`
3. Add recovery routine for stale `PROCESSANDO` older than threshold.

Acceptance criteria:

- Two concurrent dispatch workers cannot send the same job twice.

### Phase E - Observability

1. Add structured logs with idempotency key and claim result.
2. Add metrics counters:
   - `jobs_claimed`
   - `jobs_skipped_already_claimed`
   - `jobs_duplicate_blocked`

Acceptance criteria:

- Duplicate prevention is measurable in logs/metrics.

---

## 4) UI/UX Overhaul Plan (High-End SaaS, In-Place)

### 4.1 Current UI Components to Replace

- `src/modules/whatsapp/components/whatsapp-header.tsx`
- `src/modules/whatsapp/components/instances-list.tsx`
- `src/modules/whatsapp/components/automacoes-list.tsx`
- hooks under `src/modules/whatsapp/hooks/*`

### 4.2 In-Place Folder Structure (Lean)

Refactor the existing module in place with minimum file growth:

```text
src/modules/whatsapp/
  page.tsx
  components/
    whatsapp-header.tsx                  # redesign visual shell
    instances-list.tsx                   # evolve into status-card grid
    automacoes-list.tsx                  # evolve into flow-style list
    dispatch-command-bar.tsx             # new (only if automacoes-list stays clean)
    dispatch-progress-overlay.tsx        # new (optional extraction)
    create-automation-slideover.tsx      # new (optional extraction)
    connectivity-badge.tsx               # new (small reusable primitive)
  hooks/
    use-whatsapp-module.ts               # single public VM hook
    use-connectivity-polling.ts          # new (only if needed)
    use-dispatch-command.ts              # new (only if needed)

src/lib/
  whatsapp-automations.ts               # backend fix + locking

prisma/
  schema.prisma                         # idempotency columns/index
```

Notes:

- Keep `src/app/(dashboard)/whatsapp/page.tsx` and `src/components/modulo-whatsapp.tsx` intact as entry points.
- Prefer extracting new components only when complexity justifies it.
- Default to fewer files and clearer boundaries over heavy decomposition.

### 4.3 DX Guardrails (80/20 + DRY)

Must:

- Keep `src/modules/whatsapp/page.tsx` thin (composition only).
- Keep one public module hook (`use-whatsapp-module.ts`) as the view-model/orchestrator.
- Keep dispatch invariant explicit in `src/lib/whatsapp-automations.ts`: claim before send, send only once.
- Reuse existing UI primitives (`Button`, `Card`, `Dialog/Drawer`, `Input`, `Select`) and existing visual conventions.

Should:

- Move duplicate request/state logic out of components into hooks only when reused or when component exceeds maintainability threshold.
- Preserve optimistic update + rollback pattern used in other modules.
- Normalize API validation and error shape with existing `src/lib/validacoes.ts` patterns.

Avoid:

- Creating `whatsapp-v2` or parallel module trees.
- Introducing repository/service-class layers without clear duplication pressure.
- Adding many tiny files that increase navigation overhead.
- Introducing new infra (queue system) for now.

### 4.4 UX Blueprint by Feature

#### A) Dashboard Status Cards

- Responsive card grid (`1/2/3/4` columns by breakpoints).
- Card sections:
  - instance name + provider icon
  - connectivity badge (pulsing green/red)
  - last sync / queue stats
  - quick actions (connect, reconnect, open QR)
- Hover micro-interactions:
  - subtle elevation
  - border tint shift
  - icon motion (120-180ms)

#### B) Automation Flow-Builder List

- Replace dense list with structured rows showing:
  - `Trigger` block
  - arrow connector
  - `Action` block
  - status chip / schedule metadata
- Visual hierarchy: neutral grays, high contrast labels, small helper text.
- Include filtering chips (event, status, instance).

#### C) Command Bar + Dispatch Overlay

- Prominent command bar at top-right or sticky footer for mobile.
- Main CTA: `Disparar agora`.
- On action, show glassmorphism progress overlay with:
  - step indicator (queued -> processing -> done)
  - success/error summary
  - non-blocking close

#### D) Slide-over for Create Automation

- Use side panel (drawer/sheet) instead of full page/modal.
- Keep context visible beneath.
- Form sections:
  - trigger selection
  - stage condition
  - message template/preview
  - delays and schedule
- Optimistic save feedback + inline validation.

#### E) Theming and Typography

- Build color tokens in `theme/whatsapp-theme.ts`.
- Support light/dark via semantic variables.
- Use high-readability sans-serif stack already adopted in project; ensure consistent gray-to-black text hierarchy.
- Spacing scale strict and consistent (4/8/12/16/24/32).

---

## 5) Detailed Execution Plan (Frontend, In-Place, Lean)

### Phase F - Foundations in Existing Module

1. Keep `src/modules/whatsapp/page.tsx` as orchestrator.
2. Introduce tokenized visual constants in module scope (or shared style util) without changing route architecture.
3. Keep a single orchestration hook (`use-whatsapp-module.ts`) and fold duplicate logic from secondary hooks when possible.

Acceptance criteria:

- Existing WhatsApp page renders with improved UX and no route/module split.

### Phase G - Status Cards + Realtime Badge

1. Build dashboard grid and cards.
2. Implement connectivity polling inline in existing hook; extract `use-connectivity-polling.ts` only if reuse/clarity demands.
3. Add skeleton and empty states.

Acceptance criteria:

- Card status updates correctly and interactions remain smooth on desktop/mobile.

### Phase H - Automation Flow List

1. Refactor current `automacoes-list.tsx` to show `Trigger -> Action` with better hierarchy.
2. Add sorting/filtering controls.
3. Refactor `automacoes-list.tsx` in place to consume the new flow item component.

Acceptance criteria:

- Automations are scannable in one glance with clear path readability.

### Phase I - Command Bar + Overlay

1. Add command bar UX in `automacoes-list.tsx`; extract `dispatch-command-bar.tsx` only if file gets too large.
2. Add progress overlay and completion summary; extract overlay component only if needed.
3. Handle retries and cancellation UX.

Acceptance criteria:

- Dispatch feedback is immediate, contextual, and non-disruptive.

### Phase J - Slide-over Create Flow

1. Implement slide-over and keep form colocated first; extract `automation-form.tsx` only if complexity grows.
2. Add validations, optimistic submit, error states.
3. Refresh flow list and status metrics on success.

Acceptance criteria:

- New automation can be created without leaving page context.

### Phase K - In-Place Stabilization

1. Validate compatibility for users/perfis in current route.
2. Keep incremental rollout behind feature flags at component/feature level (not module-level fork).
3. Remove deprecated UI branches after stabilization.

Acceptance criteria:

- Safe rollback exists via feature flags and preserved component contracts.

---

## 6) Validation Pipeline (for AI execution)

After each significant phase:

1. `npm run lint`
2. `npm run build`
3. Manual logic review:
   - duplicate scheduling scenarios
   - concurrent dispatch scenario
   - same-stage move no-op
   - UI interactions in desktop/mobile and dark/light modes

---

## 7) Essential Final File Map (Reduced)

Keep the end-state focused on these files:

- `src/modules/whatsapp/index.ts`
- `src/modules/whatsapp/page.tsx`
- `src/modules/whatsapp/types.ts`
- `src/modules/whatsapp/hooks/use-whatsapp-module.ts`
- `src/modules/whatsapp/components/whatsapp-header.tsx`
- `src/modules/whatsapp/components/instances-list.tsx`
- `src/modules/whatsapp/components/automacoes-list.tsx`
- `src/app/api/leads/[id]/mover/route.ts`
- `src/app/api/whatsapp/automations/follow-up/dispatch/route.ts`
- `src/app/api/internal/whatsapp/follow-up/dispatch/route.ts`
- `src/lib/whatsapp-automations.ts`
- `prisma/schema.prisma`

Optional only if justified by complexity:

- `src/modules/whatsapp/components/connectivity-badge.tsx`
- `src/modules/whatsapp/components/dispatch-command-bar.tsx`
- `src/modules/whatsapp/components/dispatch-progress-overlay.tsx`
- `src/modules/whatsapp/components/create-automation-slideover.tsx`
- `src/modules/whatsapp/hooks/use-connectivity-polling.ts`
- `src/modules/whatsapp/hooks/use-dispatch-command.ts`

---

## 8) Test Plan (must be implemented)

### Backend Tests

1. Idempotency test:
   - same `(lead, stage, automation, step)` repeated events produce one job.
2. Same-stage no-op test for mover route.
3. Concurrency dispatch test:
   - two workers attempt same pending rows; only one sends.
4. Recovery test for stale `PROCESSANDO`.

### Frontend Tests

1. Status badge state transition rendering.
2. Flow item readability and path rendering.
3. Command bar dispatch states (idle/loading/success/error).
4. Slide-over create automation happy path + validation errors.

---

## 9) Rollout & Risk Controls

1. Ship backend idempotency + locking first.
2. Monitor duplicate-related logs/metrics for 24-72h.
3. Release redesigned UI incrementally in the existing module behind feature flags.
4. Expand rollout gradually.
5. Remove legacy dedupe behavior after confirmed stability.

Known risks:

- If business expects re-triggering when a lead re-enters same stage later, key semantics must include event epoch/window.
- If worker crashes after claim, jobs can remain `PROCESSANDO`; reaper is mandatory.

---

## 10) AI Implementation Prompt (Copy/Paste)

Use this prompt with your coding AI to execute the full upgrade:

```text
Implement the WhatsApp module overhaul in this repository with two objectives:

1) Fix duplicate follow-up dispatches by implementing deterministic idempotency and race-safe job claiming.
2) Redesign the existing WhatsApp UI module in place with status cards, flow-style automation list, command bar dispatch, glass progress overlay, and slide-over creation flow.

Hard requirements:
- Add deterministic idempotency key using (id_lead + id_estagio_trigger + id_whatsapp_automacao + id_etapa) scoped by id_empresa.
- Enforce DB uniqueness on idempotency key in WhatsappAutomacaoAgendamento.
- Add same-stage no-op guard in lead stage move route.
- Add atomic claim-locking (PENDENTE -> PROCESSANDO) before dispatch send.
- Ensure both dispatch endpoints use the same lock-safe processor.
- Add stale PROCESSANDO recovery.
- Do not create a parallel module (no whatsapp-v2). Refactor in place under src/modules/whatsapp.
- Keep current route/module entrypoints and use feature flags for incremental rollout.

Validation after each phase:
- npm run lint
- npm run build

Deliverables:
- Code changes
- Prisma migration
- Tests for idempotency and dispatch concurrency
- Brief changelog of files changed and rationale
```
