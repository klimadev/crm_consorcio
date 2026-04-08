# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-04-08] Playwright network isolation can block localhost here**
   Do instead: if `browser`/`request` cannot reach `127.0.0.1:3333`, fall back to Node `fetch` with `APP_URL` override.
1. **[2026-04-05] Preserve the module boundary in dashboard routes**
   Do instead: keep `src/app` pages thin and move view logic into `src/modules/...` hooks and components.
2. **[2026-04-05] Responsive breakpoints must follow usable content width**
   Do instead: when a persistent sidebar exists, review `lg/xl` grids and paddings against the remaining module area instead of the full viewport width.

## Domain Behavior Guardrails
1. **[2026-04-08] `ADMINISTRADOR` is cargo, not a fourth profile**
   Do instead: treat login `perfil: EMPRESA` as the admin access path, even when the `Funcionario.cargo` is `ADMINISTRADOR`.
2. **[2026-04-08] Gerente team creation is PDV-scoped**
   Do instead: allow `GERENTE` to add only `COLABORADOR` in the same PDV; let `EMPRESA` create any cargo in any PDV.
1. **[2026-04-06] Conflito de metas precisa respeitar a medicao**
   Do instead: ao validar duplicidade em `metas`, compare equipe + periodo + combinacao de `tipo_meta` com `origem_resultado`, nao apenas a sobreposicao do periodo.
2. **[2026-04-05] Metas screen already exposes weekly metadata**
   Do instead: prefer `periodo_item.semana_do_mes` and `periodo_item.periodo_label` before inventing derived week labels in the UI.

## User Directives
1. **[2026-04-05] Avoid AI-looking dashboard relayouts**
   Do instead: use the current data model and build a clearer hierarchy around the real weekly mental model users already use.
