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

## Vocabulário de produto (Entrega 1 do redesign, 2026-10-12)

A linguagem visível tem fonte única em `src/lib/financeiro/vocabulario.ts`. O banco e a API seguem com os códigos de máquina; nenhuma tela define rótulo de status ou de modo de cancelamento próprio.

| Código (API/banco) | Rótulo na tela |
|---|---|
| AGUARDANDO | A vencer |
| ATRASADA | Em atraso |
| PAGA | Paga |
| CANCELADA | Cancelada |
| ABORTADA | Encerrada |
| modo PONTUAL | Cancelar apenas esta parcela |
| modo SUBSEQUENTES | Cancelar esta e encerrar as próximas |

Outras decisões aplicadas:

- Acentuação completa das strings visíveis da feature (módulo recebimentos, drawer de parcelas, rotas de parcelas e esquemas Zod).
- Undo de pagamento: o toast de pagamento carrega a ação Desfazer (8s), via `PATCH /api/parcelas/[id]` com `data_pagamento: null`. Aplicado na VM de recebimentos e no hook do drawer.
- A lixeira saiu da tabela de /recebimentos; exclusão individual permanece só no drawer do lead, com confirmação.
- O diálogo "Remover plano" oferece primeiro a ação segura ("Manter pagas e remover pendentes"); "Excluir plano inteiro" é botão discreto.
- Badges unificados a partir de `ROTULOS_STATUS`; cores dos gráficos migraram de hex hardcoded para tokens (`var(--success)`, `var(--info)`, `var(--warning)`, `var(--border)`).
- Teste de contrato do cancelar atualizado para a mensagem acentuada.

## Carteira por cliente (Entrega 2 do redesign, 2026-10-12)

A tela de /recebimentos deixou de ser um relatório de parcelas e passou a ser uma carteira de clientes. Um cliente, uma linha, uma verdade.

Contrato da API (`GET /api/recebimentos`):

- `lista`, `paginacao`, `contadoresAbas` e `aba/ordenar/direcao/pagina/limite` saíram do contrato (cutover limpo; o único consumidor é o módulo).
- Novo `carteira: ClienteCarteira[]`, montado por `montarCarteira` (`src/lib/financeiro/carteira.ts`, função pura testada) a partir de 4 `groupBy id_lead`: atrasadas, a vencer, pagas no período e pagas globais (progresso do plano) + 1 `findMany` de leads para nome/telefone.
- Cada cliente carrega: estado agregado (`em_atraso` | `em_dia` | `pago_no_periodo`), valor em risco, pendências, próximo vencimento, primeiro atraso, último pagamento e progresso do plano (`pagasPlano/totalPlano`).
- Ordenação por risco em memória (volume por empresa é pequeno): atraso por valor desc, em dia por próximo vencimento, pago por último pagamento.

Frontend (`src/modules/recebimentos/`):

- `RespostaDeHoje`: hero answer-first ("N clientes para cobrar · R$ X") com CTA "Iniciar cobranças" e estado positivo quando ninguém deve.
- Chips filtram estado do cliente no próprio cliente (instantâneo, zero refetch): Em atraso / A vencer / Todos.
- Cards de cliente com iniciais, progresso do plano, datas relativas ("venceu há 12 dias"), "Cobrar no WhatsApp" (`wa.me` via `normalizarTelefoneParaWhatsapp`) e expansão lazy das parcelas via `GET /api/parcelas?id_lead=` (endpoint existente reutilizado).
- Panorama recolhível guarda KPIs, gráficos e filtros avançados (período, PDV, responsável).
- Filtros vivem na URL (`useSearchParams` + `router.replace`): sobrevivem a F5 e são compartilháveis. Busca com debounce de 350ms e stale-while-revalidate (dados antigos ficam na tela durante a revalidação; refresh manual removido).
- `recebimentos-tabs.tsx`, `recebimentos-table.tsx` e `recebimentos-mobile-list.tsx` foram removidos (o card serve desktop e mobile).

Verificação: 19/19 testes (5 novos de `montarCarteira`), oxlint sem erros nos arquivos da entrega e smoke autenticado ponta a ponta no dev server (login EMPRESA → criação de lead → geração de plano → carteira agregou 1 cliente `em_dia` R$ 1.500 → pagamento refletiu `pagasPlano: 1` → undo voltou a 0).

## Trabalho humano (Entrega 3 do redesign, 2026-10-12)

- **Modo foco** (`src/modules/recebimentos/components/modo-foco.tsx`): o CTA "Iniciar cobranças" do hero abre a fila um cliente por vez (snapshot da fila na abertura). Três decisões por cartão: Cobrar no WhatsApp, Registrar pagamento (o mais antigo em atraso, com o mesmo toast Desfazer) e Depois. Quando o cliente resolve, o cartão comemora e oferece Próximo; ao esgotar a fila, "Cobranças de hoje concluídas."
- **Nota de cobrança** (`observacao_cobranca` em `Parcela`): a memória da negociação ("cliente pediu prazo até sexta") vive junto da parcela. Migration `20261012150000_observacao_cobranca` (SQLite `ADD COLUMN`, sem rebuild de tabela), aplicada via `prisma db execute` + `prisma generate` (histórico manual do repo). Fluxo: `NotaCobranca` (componente reutilizável) → VM (`salvarObservacao`) → `PATCH /api/parcelas/[id]` com `observacao_cobranca` (Zod: string ≤500 ou null; cancelada/encerrada segue bloqueada para edição).
- **Auditoria visível**: o motivo do cancelamento aparece inline na linha da parcela da carteira ("saiu da cobrança há 5 dias · motivo: cliente desistiu") e no card do drawer.
- **Craft e a11y**: todos os controles da carteira, chips e modo foco em 44px; labels do gerador de plano vinculados (o primitivo `DatePicker` ganhou `id` + `rotuloAcessivel`); `prefers-reduced-motion` já existia no globals.css e cobre os animates.

Verificação: oxlint com 0 erros nos arquivos da entrega, 24/24 testes (5 novos do contrato do PATCH com nota: salva, limpa com null, cancelada bloqueada, Zod >500, COLABORADOR 403) e build de produção verde.
