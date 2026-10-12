# Plano Aplicado — Gestão de Ciclo de Vida e Abortamento de Parcelas (Churn Tracking)

> Epic concluído em 2026-10-11. Este documento registra a implementação final aplicada.

## Máquina de estados (5 status)

`AGUARDANDO` → `ATRASADA` (derivada por vencimento) / `PAGA` / `CANCELADA` / `ABORTADA`.

- `PAGA`, `CANCELADA` e `ABORTADA` são estados persistidos no banco.
- `ATRASADA` é derivada em cálculo (`calcularStatusParcela`): `AGUARDANDO` sem pagamento e com vencimento vencido.
- **Churn Focus:** cancelar o plano a partir da parcela K → K = `CANCELADA`, J > K não pagas = `ABORTADA`; parcelas `PAGA` anteriores permanecem intactas.

## Banco (SQLite)

- `prisma/migrations/20261011120000_status_parcela_5_estados/migration.sql` — reconstrução da tabela `Parcela` com:
  - CHECK constraint dos 5 status (SQLite não suporta enum Prisma);
  - colunas novas: `motivo_cancelamento`, `cancelado_em`, `cancelado_por`;
  - conversão legada: `PAGO→PAGA`, `PENDENTE vencida→ATRASADA`, `PENDENTE→AGUARDANDO`.
- Aplicada no dev via `prisma db execute` (histórico de migrações do repo é manual; `migrate dev` tem quebra pré-existente de shadow database).

## API

| Endpoint | Comportamento |
|---|---|
| `PATCH /api/parcelas/[id]/cancelar` | `{modo: "PONTUAL"\|"SUBSEQUENTES", motivo?, data_cancelamento?}`. EMPRESA/GERENTE; parcela `PAGA` → 400; SUBSEQUENTES usa `$transaction` (K→CANCELADA; J>K não pagas→ABORTADA). |
| `PATCH /api/parcelas/[id]/reabrir` | CANCELADA/ABORTADA → AGUARDANDO, limpa dados de cancelamento. |
| `GET/POST/DELETE /api/parcelas` | Nova tab `canceladas`; criação com `AGUARDANDO`; hard-delete preservado (US-03). |
| `PATCH /api/parcelas/[id]` | Bloqueia edição de CANCELADA/ABORTADA ("Reabra a parcela primeiro."). |
| `POST /api/parcelas/[id]/pagar` | Só aceita AGUARDANDO/ATRASADA. |
| `GET /api/recebimentos` | Segrega churn: `totalPerdidoChurn`, `quantidadePerdidas`, `taxaRetencaoParcelas`, `churnPorParcela` (curva de churn por `numero_parcela`), `quantidadeAbortadas`, `totalAbortado`; aba `canceladas` no union/zod/contadores. |

## Libs

- `src/lib/financeiro/parcelas.ts`: state machine + resumo com churn fora do atraso e do previsto ativo.
- `src/lib/api/parcelas.ts` / `recebimentos.ts`: tipos dos 5 status.
- Sweep de queries legadas: `src/lib/metas.ts`, `analise-inteligente/engine.ts`, `api/metas/**` ("PAGO"→"PAGA").

## Frontend

- **Drawer do lead** (`src/modules/parcelas`, `kanban/lead-parcelas-tab.tsx`, `use-lead-parcelas.ts`): badges semânticos (AGUARDANDO azul/ciano, ATRASADA rose, PAGA emerald, CANCELADA amber, ABORTADA slate riscada), ações [Marcar como Pago] / [Cancelar Parcela…] / [Reabrir] / [Excluir] com touch targets ≥44px.
- **Modal de cancelamento** (`cancelar-parcela-dialog.tsx`): Progressive Disclosure — escolha PONTUAL vs SUBSEQUENTES; prévia dinâmica ("Parcela #K Cancelada; #X..#Y Abortadas; R$ Z fora do fluxo futuro"); motivo opcional; `navigator.vibrate([15,50,15])` no sucesso. Novo primitivo `components/ui/radio-group.tsx`.
- **/recebimentos**: aba "Canceladas", donut com fatias amber/slate para perdidas, card "Perda por churn" e Churn Curve (canceladas por nº de parcela).

## Testes

- `src/lib/financeiro/parcelas.test.ts` (8) — transições de estado e segregação de churn no resumo.
- `src/app/api/parcelas/[id]/cancelar/route.test.ts` (6) — PONTUAL, SUBSEQUENTES (transação + where), PAGA→400, COLABORADOR→403, isolamento multi-tenant, Zod inválido→400.
- Falhas pré-existentes na suíte (leads/mover, extract-json, whatsapp-integration porta 3333) foram confirmadas idênticas na baseline HEAD — fora do escopo.
