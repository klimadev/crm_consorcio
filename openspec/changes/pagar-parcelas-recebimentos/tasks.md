## 1. Hook — Mutation de pagamento

- [x] 1.1 Adicionar estado `pagando: string | null` e importar `pagarParcela` de `@/lib/api/parcelas` em `use-recebimentos-module.ts`
- [x] 1.2 Implementar função `pagarParcelaModule(idParcela, dataPagamento?)` com optimistic update (backup + rollback) seguindo o padrão de `use-lead-parcelas.ts:104-128`
- [x] 1.3 Exibir toast de sucesso/erro usando `useToast` (já usado no módulo? verificar se precisa importar)
- [x] 1.4 Chamar `recarregar()` após pagamento bem-sucedido para atualizar KPIs, gráficos e contadores
- [x] 1.5 Atualizar `UseRecebimentosModuleReturn` em `types.ts` com `pagando` e `pagarParcela`

## 2. Tabela desktop — Ação inline

- [x] 2.1 Substituir coluna \"Ação\" em `recebimentos-table.tsx`: remover o botão único \"Abrir lead\" como única ação
- [x] 2.2 Adicionar botão \"Marcar como Pago\" (emerald) visível apenas para `status !== \"PAGO\"`, com estado de loading (`Loader2`) quando `vm.pagando === item.id`
- [x] 2.3 Implementar expansão inline: ao clicar \"Marcar como Pago\", renderizar `<input type=\"date\">` + botão \"Confirmar\" + botão \"Cancelar\" dentro da célula (padrão `InstallmentCard`)
- [x] 2.4 Manter link \"Abrir lead\" como ação ghost secundária ao lado do botão de pagamento
- [x] 2.5 Linha com status `PAGO` exibe apenas o link \"Abrir lead\" (sem botão de pagamento)

## 3. Cards mobile — Ação inline

- [x] 3.1 Adicionar botão \"Marcar como Pago\" nos cards de `recebimentos-mobile-list.tsx` para itens `PENDENTE`/`ATRASADO`
- [x] 3.2 Implementar expansão inline com date picker e confirmação (mesmo comportamento da tabela desktop)
- [x] 3.3 Substituir botão \"Abrir\" atual pelo link \"Abrir lead\" como ação secundária

## 4. Validação e qualidade

- [x] 4.1 Rodar `pnpm lint` e corrigir eventuais erros
- [x] 4.2 Rodar `pnpm build` para garantir que não há erros de compilação
- [ ] 4.3 Testar fluxo completo no navegador: acessar `/recebimentos`, marcar parcela como paga, verificar optimistic update, verificar KPIs atualizados, verificar rollback em caso de erro simulado
