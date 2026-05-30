## ADDED Requirements

### Requirement: Pagamento inline na tabela de recebimentos

O sistema SHALL exibir um botão "Marcar como Pago" em cada linha da tabela de recebimentos cujo status seja `PENDENTE` ou `ATRASADO`. Ao clicar, o botão SHALL expandir um seletor de data (com valor padrão igual à data atual) e um botão "Confirmar". Ao confirmar, o sistema SHALL registrar o pagamento da parcela via `PATCH /api/parcelas/[id]/pagar` e atualizar a linha para status `PAGO` de forma otimista.

#### Scenario: Marcar parcela pendente como paga

- **WHEN** o usuário clica em "Marcar como Pago" em uma linha com status `PENDENTE`
- **THEN** um seletor de data inline aparece com a data atual preenchida
- **AND** ao clicar "Confirmar", a linha transiciona para status `PAGO` com indicador visual verde
- **AND** o botão exibe `Loader2` animado enquanto a requisição está em andamento

#### Scenario: Marcar parcela atrasada como paga

- **WHEN** o usuário clica em "Marcar como Pago" em uma linha com status `ATRASADO`
- **THEN** o mesmo fluxo de confirmação é exibido
- **AND** após confirmação, o status muda para `PAGO` e o badge de dias em atraso é removido

#### Scenario: Cancelar ação de pagamento

- **WHEN** o seletor de data inline está expandido
- **AND** o usuário clica em "Cancelar"
- **THEN** o seletor de data é recolhido e o estado da linha permanece inalterado

#### Scenario: Data de pagamento customizada

- **WHEN** o usuário altera a data no seletor antes de confirmar
- **THEN** o pagamento SHALL ser registrado com a data escolhida pelo usuário

### Requirement: Pagamento inline nos cards mobile de recebimentos

O sistema SHALL exibir a mesma funcionalidade de pagamento inline nos cards da visualização mobile (`RecebimentosMobileList`), com o mesmo comportamento de expansão, seleção de data e confirmação.

#### Scenario: Pagamento via card mobile

- **WHEN** o usuário visualiza a lista mobile de recebimentos
- **AND** clica em "Marcar como Pago" em um card com status `PENDENTE` ou `ATRASADO`
- **THEN** o seletor de data expande inline dentro do card
- **AND** ao confirmar, o card transiciona para status `PAGO`

### Requirement: Optimistic update com rollback

O sistema SHALL aplicar optimistic update ao marcar uma parcela como paga: o status da linha SHALL ser alterado para `PAGO` imediatamente após a confirmação, antes da resposta da API. Se a API retornar erro, o sistema SHALL reverter a linha ao estado anterior e exibir um toast de erro.

#### Scenario: Rollback em caso de falha da API

- **WHEN** o usuário confirma o pagamento
- **AND** a requisição `PATCH /api/parcelas/[id]/pagar` retorna erro (ex: rede, parcela já paga)
- **THEN** a linha volta ao status original (`PENDENTE` ou `ATRASADO`)
- **AND** um toast de erro é exibido com a mensagem da API

#### Scenario: Otimismo visual durante carregamento

- **WHEN** o usuário confirma o pagamento
- **THEN** a linha imediatamente reflete status `PAGO` com badge verde
- **AND** o indicador `Loader2` é exibido no botão enquanto a requisição não completa

### Requirement: Atualização de indicadores após pagamento

Após o pagamento bem-sucedido de uma parcela, o sistema SHALL recarregar os dados do painel de recebimentos (`recarregar()`) para atualizar KPIs (total recebido, total em aberto, taxa de adimplência), gráficos e contadores de abas.

#### Scenario: KPIs atualizados após pagamento

- **WHEN** uma parcela é marcada como paga com sucesso
- **THEN** os KPIs do topo do painel são recalculados com os novos valores do servidor
- **AND** os gráficos de recebimentos por período e distribuição de status são atualizados
- **AND** os contadores de abas (todos, recebidos, a vencer, atrasados) refletem o novo estado

### Requirement: Ação secundária "Abrir lead" preservada

O sistema SHALL manter o link "Abrir lead" como ação secundária em cada linha/card, permitindo ao usuário navegar para o kanban e acessar detalhes completos do lead quando necessário.

#### Scenario: Navegação para o kanban preservada

- **WHEN** o usuário visualiza uma linha na tabela de recebimentos
- **THEN** o link "Abrir lead" está disponível como ação secundária ao lado do botão de pagamento
- **AND** ao clicar, o usuário é redirecionado para `/kanban?lead=<id>` com o drawer do lead aberto

### Requirement: Restrição a perfis autorizados

O botão "Marcar como Pago" SHALL ser renderizado apenas para o perfil EMPRESA, consistente com o controle de acesso já existente na página de recebimentos (`(dashboard)/recebimentos/page.tsx`).

#### Scenario: Perfil EMPRESA vê o botão de pagamento

- **WHEN** um usuário com perfil EMPRESA acessa `/recebimentos`
- **THEN** o botão "Marcar como Pago" está visível para parcelas com status `PENDENTE` ou `ATRASADO`

#### Scenario: Perfis sem acesso não veem a página

- **WHEN** um usuário com perfil GERENTE ou COLABORADOR acessa `/recebimentos`
- **THEN** o componente `AccessDeniedCard` é exibido, bloqueando acesso a qualquer funcionalidade do módulo
