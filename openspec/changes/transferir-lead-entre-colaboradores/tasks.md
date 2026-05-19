## 1. Banco de Dados

- [ ] 1.1 Adicionar model `TransferenciaLead` ao `prisma/schema.prisma` com campos `id`, `id_lead`, `id_funcionario_origem`, `id_funcionario_destino`, `status`, `criado_em`, `respondido_em` e relações FK com `Lead` e `Funcionario`
- [ ] 1.2 Adicionar `@@unique([id_lead, status])` com condição parcial `WHERE status = 'PENDENTE'` via custom migration (garantir no máximo 1 convite pendente por lead)
- [ ] 1.3 Adicionar índices em `id_funcionario_origem` e `id_funcionario_destino`
- [ ] 1.4 Gerar migration com `prisma migrate dev` e validar que o banco reflete o schema

## 2. API — Nova rota de transferência

- [ ] 2.1 Criar `src/app/api/leads/[id]/transferencia/route.ts` com handlers `POST`, `PATCH` e `DELETE`
- [ ] 2.2 Implementar `POST`: validar que COLABORADOR logado é dono do lead; validar `id_funcionario_destino` (COLABORADOR ativo, mesmo PDV, mesma empresa); validar que não existe `TransferenciaLead` PENDENTE para o lead; criar registro com status `PENDENTE`; retornar `201`
- [ ] 2.3 Implementar `PATCH`: validar que COLABORADOR logado é o destinatário do convite; validar que status atual é `PENDENTE`; se `acao = "ACEITAR"`, usar `prisma.$transaction` para atualizar `lead.id_funcionario` + `TransferenciaLead.status = "ACEITA"` + `respondido_em`; se `acao = "RECUSAR"`, atualizar status para `RECUSADA` + `respondido_em`
- [ ] 2.4 Implementar `DELETE`: validar que COLABORADOR logado é o remetente do convite; validar que status atual é `PENDENTE`; atualizar status para `RECUSADA` + `respondido_em` (soft cancel)
- [ ] 2.5 Adicionar esquema Zod `esquemaTransferirLead` em `src/lib/validacoes.ts` para validar payload (POST: `{ id_funcionario_destino }`, PATCH: `{ acao: "ACEITAR" | "RECUSAR" }`)
- [ ] 2.6 Adicionar helper `obterTransferenciaPendenteLead(leadId)` para queries de busca de transferência por lead

## 3. API — Modificação do GET /api/leads

- [ ] 3.1 Modificar `GET /api/leads` (`src/app/api/leads/route.ts`) para incluir dados de `TransferenciaLead` PENDENTE no response de cada lead (campo opcional `transferencia_pendente` com origem, destino, status, criado_em)
- [ ] 3.2 Estender `whereLeadsPorPerfil` em `src/lib/permissoes.ts` para COLABORADOR: além dos próprios leads (`id_funcionario = self`), incluir leads com `TransferenciaLead` PENDENTE onde `id_funcionario_destino = self` (para popular coluna de transferências recebidas)
- [ ] 3.3 Garantir que leads com transferência pendente recebida (destinatário) são retornados com os mesmos includes (funcionario, pdv, gestores, parcelas) que leads próprios

## 4. Frontend — Tipos e dados

- [ ] 4.1 Adicionar type `TransferenciaPendente` em `src/modules/kanban/types.ts` com campos: `id`, `status`, `origem: { id, nome }`, `destino: { id, nome }`, `criado_em`
- [ ] 4.2 Adicionar campo opcional `transferencia_pendente` no type `Lead`
- [ ] 4.3 Adicionar funções de API client em `src/lib/api/kanban.ts`: `criarTransferencia(idLead, idFuncionarioDestino)`, `responderTransferencia(idLead, acao)`, `cancelarTransferencia(idLead)`
- [ ] 4.4 Atualizar `useKanbanDados` (`use-kanban-dados.ts`) para expor `leads` já com campo `transferencia_pendente` populado pelo backend
- [ ] 4.5 Atualizar `useKanbanDerivacoes` (`use-kanban-derivacoes.ts`) para separar leads em duas listas: `leadsTransferencia` (onde `transferencia_pendente` existe e `destino.id === self`) e `leadsNormais` (demais)

## 5. Frontend — Coluna de transferências recebidas

- [ ] 5.1 Criar `src/modules/kanban/components/transferencia-card.tsx`: card que exibe nome do lead, telefone, valor, nome do remetente, e botões "Aceitar" e "Recusar" com loading state (`Loader2` ao clicar)
- [ ] 5.2 Modificar `src/modules/kanban/components/kanban-board.tsx`: renderizar coluna "📥 Transferências Recebidas" como primeira coluna do board quando `leadsTransferencia.length > 0`, usando `TransferenciaCard` para cada lead
- [ ] 5.3 Coluna de transferências NÃO deve suportar drag-and-drop (não é um estágio do funil)

## 6. Frontend — Botão de transferir no drawer

- [ ] 6.1 Criar `src/modules/kanban/components/transferir-lead-dialog.tsx`: dialog com `<Select>` para escolher COLABORADOR destino (filtrado por mesmo PDV), mensagem de confirmação e botão "Enviar Convite"
- [ ] 6.2 Modificar `src/modules/kanban/components/lead-details-tab-content.tsx`: para COLABORADOR, substituir seletor oculto de Responsável por:
  - Se lead NÃO tem `transferencia_pendente`: botão "Transferir Lead" que abre `TransferirLeadDialog`
  - Se lead TEM `transferencia_pendente` com origem = self: badge "Transferência pendente para Fulano" + botão "Cancelar Transferência"
- [ ] 6.3 Adicionar callback `onTransferirLead` e `onCancelarTransferencia` no hook `useKanbanDetalhesLead` que invocam as funções de API client e atualizam estado local

## 7. Frontend — Indicador visual no card do remetente

- [ ] 7.1 Modificar o componente de card do kanban (usado em `kanban-board.tsx`) para exibir badge visual "Transferindo..." quando `lead.transferencia_pendente` existe e `origem.id === self`
- [ ] 7.2 Garantir que o badge é removido imediatamente após aceitação/recusa/cancelamento (via atualização de estado local)

## 8. Integração e feedback

- [ ] 8.1 Adicionar toasts de sucesso/erro para todas as ações (convite enviado, transferência aceita, transferência recusada, convite cancelado)
- [ ] 8.2 Garantir que `useKanbanRealtime` (Polling/SSE) reflete mudanças de transferência (lead que foi aceito aparece no kanban do novo dono)
- [ ] 8.3 Garantir que GERENTE e EMPRESA conseguem visualizar os indicadores de transferência pendente nos leads da sua visão (sem ações além de visualização)
- [ ] 8.4 Testar fluxo completo manualmente: criar convite, aceitar, recusar, cancelar, validar transição de estado do lead em ambos os kanbans

## 9. Validação e testes

- [ ] 9.1 Executar `pnpm lint` e corrigir eventuais erros
- [ ] 9.2 Executar `pnpm build` e garantir que não há erros de compilação TypeScript
- [ ] 9.3 Verificar cenários de borda: lead excluído com transferência pendente (cascade), destinatário inativado antes de aceitar, dupla tentativa de transferência no mesmo lead
- [ ] 9.4 Verificar que GERENTE e EMPRESA continuam funcionando com transferência direta (`PATCH /api/leads/[id]`) sem interferência do novo sistema de convites
