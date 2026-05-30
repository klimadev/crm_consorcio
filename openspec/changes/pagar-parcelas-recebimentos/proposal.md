## Why

O módulo `/recebimentos` é um dashboard consolidado de parcelas para o perfil EMPRESA, mas atualmente é apenas consultivo. Para marcar uma parcela como paga, o usuário precisa: abrir o kanban, localizar o lead, abrir o drawer, selecionar a aba "Parcelas", encontrar a parcela correta e confirmar o pagamento — uma jornada de ~7 cliques com navegação de página. Isso transforma uma ação frequente em um gargalo de produtividade.

## What Changes

- Adicionar ação inline "Marcar como Pago" nas linhas da tabela e cards mobile do módulo de recebimentos
- A ação expande um mini seletor de data + confirmação (padrão do `InstallmentCard` do kanban)
- Ação disponível apenas para parcelas com status `PENDENTE` ou `ATRASADO`
- Implementar optimistic update na lista local, com rollback em caso de erro
- Atualizar KPIs e gráficos automaticamente após pagamento (recarregar painel)
- O link "Abrir lead" permanece como ação secundária
- Zero alterações de backend/API — o endpoint `PATCH /api/parcelas/[id]/pagar` já existe

## Capabilities

### New Capabilities

- `pagamento-recebimentos`: Usuários com perfil EMPRESA podem marcar parcelas como pagas diretamente da listagem do módulo de recebimentos, com feedback visual otimista e atualização automática dos indicadores do painel.

### Modified Capabilities

<!-- Nenhum spec existente é modificado -->

## Impact

- `src/modules/recebimentos/hooks/use-recebimentos-module.ts` — adicionar mutation `pagarParcela` com optimistic update e estado `pagando`
- `src/modules/recebimentos/types.ts` — novo campo `pagando: string | null` e nova função `pagarParcela` no tipo de retorno da ViewModel
- `src/modules/recebimentos/components/recebimentos-table.tsx` — coluna de ação: substituir link único por inline date-picker + confirm
- `src/modules/recebimentos/components/recebimentos-mobile-list.tsx` — card mobile: adicionar botão de pagamento inline
- `src/lib/api/parcelas.ts` — já contém `pagarParcela()`, será importado pelo hook de recebimentos
