# 🚀 Leads Funnel Refactor — Master Plan

> **Objective**: Rename the "Kanban" module to "Leads", introduce new funnel stages ("Pré Aprovação" and "Pós Vendas"), enforce a management-approval gate before closing leads, and add highly visual, animated UI cues to communicate lead status at a glance.

---

## Table of Contents

| Document | Purpose |
|---|---|
| [01_SCHEMA_CHANGES.md](./01_SCHEMA_CHANGES.md) | Prisma schema additions (`aprovado_em`, `aprovado_por`, etc.) |
| [02_STAGES_AND_SEED.md](./02_STAGES_AND_SEED.md) | New funnel stages definition, seed script, and fixed-stages module |
| [03_BUSINESS_LOGIC.md](./03_BUSINESS_LOGIC.md) | "Pré Aprovação" business rules, approval API, drag-and-drop validation |
| [04_UI_RENAMING.md](./04_UI_RENAMING.md) | Every "Kanban" → "Leads" rename across the codebase |
| [05_VISUAL_CUES.md](./05_VISUAL_CUES.md) | Pulsating circles, column tints, emoji cues, Tailwind animation classes |
| [06_VERIFICATION.md](./06_VERIFICATION.md) | Test plan: existing tests to update, new tests, manual QA checklist |

---

## Current State Summary

| Aspect | Current |
|---|---|
| **Module name** | "Kanban" (sidebar, header, onboarding, page route) |
| **Stages** | 5: Indefinido, Em Atendimento, Proposta, Fechado, Perdido |
| **Stage types** | ABERTO, GANHO, PERDIDO |
| **Approval gate** | None — any user can drag to "Fechado" |
| **Lead schema** | `documento_aprovacao_url` exists, but no `aprovado_em` / `aprovado_por` |
| **Visual cues** | Pendency badges only (red/amber border severity) |

## Target State Summary

| Aspect | Target |
|---|---|
| **Module name** | "Leads" everywhere |
| **Stages** | 7: Indefinido, Em Atendimento, Proposta, **Pré Aprovação**, Fechado, **Pós Vendas**, Perdido |
| **Stage types** | ABERTO (4), GANHO (2), PERDIDO (1) |
| **Approval gate** | Move to Fechado requires `aprovado_por` set by EMPRESA/ADMINISTRADOR/GERENTE |
| **Lead schema** | New: `aprovado_em DateTime?`, `aprovado_por String?` |
| **Visual cues** | Pulsating red/amber/green circles, column background tints, emoji cues |

---

## Key Files Inventory

```
prisma/schema.prisma              ← Lead model changes
prisma/seed.js                    ← Default stages update
src/lib/estagios-fixos.ts         ← ESTAGIOS_FIXOS_PADRAO
src/lib/validacoes.ts             ← Move/update schemas, pendency types
src/lib/calculo-pendencias.ts     ← Pendency calculation logic
src/lib/permissoes.ts             ← New permission: podeAprovarLead
src/lib/tipos.ts                  ← TipoEstagioFunil type

src/app/api/leads/[id]/mover/route.ts       ← Approval gate enforcement
src/app/api/leads/[id]/mover/route.test.ts  ← Existing tests to update
src/app/api/leads/[id]/aprovar/route.ts     ← [NEW] Approval endpoint

src/modules/kanban/                ← Module folder
  types.ts                         ← Lead type additions
  page.tsx                         ← ModuloKanban → (rename consideration)
  hooks/use-kanban-module.ts       ← Drag-end validation logic
  components/kanban-board.tsx      ← Visual cues, column tints
  components/kanban-header.tsx     ← "Kanban" → "Leads" title
  components/lead-details-drawer.tsx ← "Aprovar Lead" button

src/components/sidebar-principal.tsx           ← "Kanban" → "Leads" label
src/components/modulo-kanban.tsx               ← Re-export rename
src/app/(dashboard)/kanban/page.tsx            ← Page route (stays)
src/modules/onboarding/steps/onboarding-kanban.steps.ts ← Tour title
src/modules/onboarding/lib/selectors.ts        ← Tour target IDs
```
