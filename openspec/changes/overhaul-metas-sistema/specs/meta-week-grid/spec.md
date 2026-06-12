## ADDED Requirements

### Requirement: Grade semanal deve mostrar equipes como linhas e semanas como colunas
A grade DEVE exibir cada equipe em uma linha com cards de semana (S1, S2, S3, S4) como colunas. Cada card DEVE mostrar: número da semana, datas, percentual, valor realizado vs alvo, status (🟢🟡🔴).

#### Scenario: grade exibe equipe com 3 semanas ativas
- **WHEN** equipe Alpha tem metas nas semanas 1, 2 e 3 do mês 2026-06
- **THEN** a grade DEVE mostrar 1 linha "Alpha" com 4 colunas: S1, S2, S3 preenchidas e S4 vazia com botão "Criar"

#### Scenario: card de semana exibe percentual e status
- **WHEN** meta da semana 1 tem alvo=25000 e realizado=20000
- **THEN** o card DEVE mostrar "80%", "R$ 20K de R$ 25K" e badge 🟢 "No ritmo"

### Requirement: Grade deve mostrar slot vazio para semanas sem meta
Semanas sem meta definida DEVEM exibir um placeholder com fundo neutro e botão "Criar meta" que abre o wizard com equipe e semana pré-selecionados.

#### Scenario: slot vazio mostra placeholder clicável
- **WHEN** equipe Beta não tem meta na semana 4
- **THEN** a coluna S4 DEVE mostrar fundo cinza claro, texto "Sem meta" e botão "+ Criar"

### Requirement: Cada card deve permitir edição e arquivamento
Cada card de semana DEVE ter botões "Editar" (abre wizard preenchido) e "Arquivar" (confirmação → soft delete). Arquivar NÃO DEVE apagar a meta, apenas marcá-la como inativa.

#### Scenario: editar abre wizard com dados preenchidos
- **WHEN** cliente clica "Editar" no card da semana 2
- **THEN** o wizard DEVE abrir com equipe, tipo, alvo, semana já preenchidos

#### Scenario: arquivar mostra confirmação
- **WHEN** cliente clica "Arquivar"
- **THEN** DEVE aparecer confirmação "Arquivar meta da Semana 2? O histórico será preservado."
- **AND** ao confirmar, a meta DEVE sumir da grade e o slot ficar vazio

### Requirement: Grade deve mostrar legenda de cores
A grade DEVE exibir legenda: 🟢 Verde = No ritmo (≥80%), 🟡 Amarelo = Atenção (≥45%), 🔴 Vermelho = Fora (<45%).

#### Scenario: legenda visível sempre
- **WHEN** grade é renderizada com ou sem metas
- **THEN** a legenda DEVE estar visível no cabeçalho da seção
