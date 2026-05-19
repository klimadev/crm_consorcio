## ADDED Requirements

### Requirement: Colaborador envia convite de transferência

O sistema DEVE permitir que um COLABORADOR envie um convite de transferência para outro COLABORADOR do mesmo PDV. O lead permanece sob responsabilidade do remetente até que o convite seja aceito.

#### Scenario: Convite criado com sucesso

- **WHEN** COLABORADOR A envia convite de transferência do lead X para COLABORADOR B (mesmo PDV, ambos ativos)
- **THEN** sistema cria `TransferenciaLead` com status `PENDENTE`, `id_funcionario_origem = A`, `id_funcionario_destino = B`
- **AND** lead X continua com `id_funcionario = A`
- **AND** lead X aparece na coluna "Transferências Recebidas" do kanban de B
- **AND** lead X exibe indicador "Transferindo..." no kanban de A

#### Scenario: Tentativa de transferir lead que não pertence ao remetente

- **WHEN** COLABORADOR A tenta transferir lead Y que pertence ao COLABORADOR C
- **THEN** sistema retorna `403 Forbidden` com mensagem "Você só pode transferir seus próprios leads."

#### Scenario: Tentativa de transferir para destinatário de PDV diferente

- **WHEN** COLABORADOR A (PDV 1) tenta transferir lead para COLABORADOR B (PDV 2)
- **THEN** sistema retorna `400 Bad Request` com mensagem "O destinatário deve pertencer ao seu PDV."

#### Scenario: Tentativa de transferir lead que já possui convite pendente

- **WHEN** COLABORADOR A tenta criar convite para lead X que já possui `TransferenciaLead` PENDENTE
- **THEN** sistema retorna `409 Conflict` com mensagem "Este lead já possui uma transferência pendente."

#### Scenario: Convite para destinatário inativo

- **WHEN** COLABORADOR A tenta transferir lead para COLABORADOR B que está inativo (`ativo = false`)
- **THEN** sistema retorna `400 Bad Request` com mensagem "O destinatário não está ativo."

---

### Requirement: Colaborador destinatário aceita transferência

O sistema DEVE permitir que o COLABORADOR destinatário aceite um convite de transferência. Ao aceitar, o lead muda de dono e o convite é finalizado.

#### Scenario: Aceitação bem-sucedida

- **WHEN** COLABORADOR B aceita o convite de transferência do lead X
- **THEN** `lead.id_funcionario` é atualizado para B
- **AND** `TransferenciaLead.status` é atualizado para `ACEITA` com `respondido_em` preenchido
- **AND** lead X desaparece da coluna "Transferências Recebidas" de B
- **AND** lead X aparece na coluna normal do funil no kanban de B, correspondente ao seu estágio atual
- **AND** lead X desaparece do kanban de A
- **AND** ambas as operações (update lead + update transferencia) ocorrem na mesma transação

#### Scenario: Tentativa de aceitar convite que não é destinado ao usuário

- **WHEN** COLABORADOR C tenta aceitar convite de transferência onde o destinatário é COLABORADOR B
- **THEN** sistema retorna `403 Forbidden`

#### Scenario: Tentativa de aceitar convite já respondido

- **WHEN** COLABORADOR B tenta aceitar convite que já foi aceito ou recusado
- **THEN** sistema retorna `400 Bad Request` com mensagem "Esta transferência já foi respondida."

---

### Requirement: Colaborador destinatário recusa transferência

O sistema DEVE permitir que o COLABORADOR destinatário recuse um convite de transferência. Ao recusar, o lead volta integralmente ao remetente e o convite é finalizado.

#### Scenario: Recusa bem-sucedida

- **WHEN** COLABORADOR B recusa o convite de transferência do lead X
- **THEN** `TransferenciaLead.status` é atualizado para `RECUSADA` com `respondido_em` preenchido
- **AND** lead X desaparece da coluna "Transferências Recebidas" de B
- **AND** lead X permanece no kanban de A, removendo o indicador de "Transferindo..."
- **AND** `lead.id_funcionario` permanece inalterado (continua sendo A)

---

### Requirement: Colaborador remetente cancela convite pendente

O sistema DEVE permitir que o COLABORADOR remetente cancele um convite de transferência antes que o destinatário responda.

#### Scenario: Cancelamento bem-sucedido

- **WHEN** COLABORADOR A cancela o convite pendente do lead X antes de B responder
- **THEN** `TransferenciaLead.status` é atualizado para `RECUSADA` com `respondido_em` preenchido
- **AND** lead X desaparece da coluna "Transferências Recebidas" de B
- **AND** lead X volta ao estado normal no kanban de A

#### Scenario: Tentativa de cancelar convite já respondido

- **WHEN** COLABORADOR A tenta cancelar convite que já foi aceito ou recusado por B
- **THEN** sistema retorna `400 Bad Request` com mensagem "Esta transferência já foi respondida."

#### Scenario: Tentativa de cancelar convite de outro remetente

- **WHEN** COLABORADOR C tenta cancelar convite criado por A
- **THEN** sistema retorna `403 Forbidden`

---

### Requirement: Coluna de transferências recebidas no kanban

O sistema DEVE exibir uma coluna dedicada "Transferências Recebidas" no kanban do COLABORADOR quando houver convites pendentes destinados a ele. Os cards nesta coluna devem mostrar os dados completos do lead e botões de ação.

#### Scenario: Coluna aparece quando há transferências pendentes

- **WHEN** COLABORADOR B possui uma ou mais `TransferenciaLead` com status `PENDENTE` onde ele é o destinatário
- **THEN** kanban de B exibe a coluna "📥 Transferências Recebidas" como primeira coluna à esquerda do funil

#### Scenario: Coluna some quando não há transferências pendentes

- **WHEN** COLABORADOR B não possui nenhuma `TransferenciaLead` com status `PENDENTE` onde ele é o destinatário
- **THEN** a coluna "📥 Transferências Recebidas" NÃO é renderizada

#### Scenario: Card de transferência exibe dados completos do lead

- **WHEN** COLABORADOR B visualiza um card na coluna "Transferências Recebidas"
- **THEN** o card exibe nome, telefone, valor do consórcio e nome do remetente do lead
- **AND** o card exibe botões "Aceitar" e "Recusar"

---

### Requirement: Indicador visual no lead do remetente

O sistema DEVE exibir um indicador visual no card do lead do remetente enquanto houver transferência pendente.

#### Scenario: Indicador visível durante pendência

- **WHEN** COLABORADOR A visualiza lead X que possui `TransferenciaLead` PENDENTE criada por ele
- **THEN** o card do lead X exibe badge "Transferindo..." ou equivalente

#### Scenario: Indicador removido após resposta

- **WHEN** o convite de transferência do lead X é aceito ou recusado
- **THEN** o indicador visual é removido do card de A (ou o card some completamente, no caso de aceitação)

---

### Requirement: GERENTE e EMPRESA mantêm transferência direta inalterada

O sistema DEVE preservar o comportamento existente de transferência direta para GERENTE e EMPRESA via `PATCH /api/leads/[id]`, sem exigir convite ou aceitação.

#### Scenario: GERENTE transfere lead diretamente

- **WHEN** GERENTE altera `id_funcionario` de um lead do seu PDV via `PATCH /api/leads/[id]`
- **THEN** lead muda de dono imediatamente, sem criar `TransferenciaLead`

#### Scenario: EMPRESA transfere lead diretamente

- **WHEN** EMPRESA altera `id_funcionario` de qualquer lead da empresa via `PATCH /api/leads/[id]`
- **THEN** lead muda de dono imediatamente, sem criar `TransferenciaLead`

---

### Requirement: Transferência cascade na exclusão do lead

O sistema DEVE remover automaticamente qualquer `TransferenciaLead` associada quando o lead correspondente for excluído.

#### Scenario: Lead excluído com convite pendente

- **WHEN** um lead X com `TransferenciaLead` PENDENTE é excluído
- **THEN** o registro de `TransferenciaLead` é removido automaticamente (ON DELETE CASCADE)
- **AND** o convite some da coluna "Transferências Recebidas" do destinatário

---

### Requirement: Validação de destinatário ativo na aceitação

O sistema DEVE validar que o COLABORADOR destinatário permanece ativo no momento da aceitação do convite.

#### Scenario: Destinatário foi inativado entre o envio e a aceitação

- **WHEN** COLABORADOR B foi inativado após receber um convite e tenta aceitá-lo
- **THEN** sistema retorna `400 Bad Request` com mensagem "Funcionário não está ativo."
