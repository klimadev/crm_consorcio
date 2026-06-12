## ADDED Requirements

### Requirement: Wizard de criação deve ter exatamente 2 passos
O wizard DEVE guiar o cliente por 2 passos sequenciais. O passo 1 DEVE conter apenas seleção de equipe, tipo de medição e valor do alvo. O passo 2 DEVE mostrar preview completo com datas e resumo antes de confirmar.

#### Scenario: passo 1 mostra campos essenciais
- **WHEN** cliente abre "Nova meta"
- **THEN** DEVE ver seletor de equipe, seletor de tipo (Valor recebido / Valor fechado / Contratos fechados) e campo de alvo

#### Scenario: passo 2 mostra preview com datas calculadas
- **WHEN** cliente avança para passo 2 após preencher equipe, tipo e alvo
- **THEN** DEVE ver preview com: equipe selecionada, tipo de medição, alvo, data_inicio (calculada), data_fim (calculada)
- **AND** o cliente NÃO DEVE precisar digitar datas manualmente para o caso "esta semana"

### Requirement: Datas devem ser calculadas automaticamente pela semana corrente
O wizard DEVE calcular `data_inicio` como segunda-feira da semana selecionada e `data_fim` como domingo da mesma semana, usando UTC.

#### Scenario: criar meta para "esta semana" em 2026-06-15 (segunda)
- **WHEN** cliente seleciona "Esta semana" na data 2026-06-15
- **THEN** `data_inicio` DEVE ser `2026-06-15` e `data_fim` DEVE ser `2026-06-21`

#### Scenario: criar meta para "próxima semana"
- **WHEN** cliente seleciona "Próxima semana" na data 2026-06-15 (segunda)
- **THEN** `data_inicio` DEVE ser `2026-06-22` e `data_fim` DEVE ser `2026-06-28`

### Requirement: Wizard deve mostrar resumo financeiro antes de criar
Antes da confirmação, o wizard DEVE exibir um resumo legível: "Equipe Alpha precisa receber R$ 25.000 esta semana (15 a 21 de junho)."

#### Scenario: resumo exibe valores corretamente
- **WHEN** cliente preenche: equipe=Alpha, tipo="Valor recebido", alvo=25000
- **THEN** o resumo DEVE mostrar "Equipe Alpha precisa receber R$ 25.000 esta semana (15 a 21 de junho)"

### Requirement: Wizard deve tratar estado de erro
Se a criação falhar (rede, validação, conflito), o wizard DEVE exibir mensagem clara e permanecer aberto com os dados preenchidos.

#### Scenario: erro de conflito exibe mensagem e mantém dados
- **WHEN** POST /api/metas retorna 409
- **THEN** o wizard DEVE exibir "Já existe uma meta ativa para esta equipe nesta semana" sem limpar os campos
