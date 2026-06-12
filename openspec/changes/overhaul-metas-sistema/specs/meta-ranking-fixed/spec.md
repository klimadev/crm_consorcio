## ADDED Requirements

### Requirement: Ranking deve ter 1 entrada por equipe (não por meta)
O ranking DEVE agrupar todas as metas ativas de uma equipe em uma única entrada. O percentual da equipe DEVE ser calculado como a média aritmética dos percentuais de cada meta ativa daquela equipe no período consultado.

#### Scenario: ranking mostra equipe uma vez mesmo com múltiplas metas
- **WHEN** equipe Alpha tem 3 metas ativas (semana 1: 80%, semana 2: 60%, semana 3: 40%)
- **THEN** o ranking DEVE mostrar Alpha 1 vez com `percentual: 60.0` (média de 80+60+40 = 180/3)
- **AND** NÃO DEVE mostrar Alpha 3 vezes no ranking

#### Scenario: equipe sem meta não aparece no ranking
- **WHEN** equipe Gama não tem nenhuma meta ativa no período
- **THEN** Gama NÃO DEVE aparecer no ranking

### Requirement: Ranking deve ordenar do maior percentual para o menor
O ranking DEVE ser ordenado por percentual decrescente. Em caso de empate, DEVE ordenar por nome da equipe (A-Z).

#### Scenario: ordenação correta do ranking
- **WHEN** Alpha=92%, Beta=74%, Gama=92%
- **THEN** a ordem DEVE ser: Alpha (92%), Gama (92%), Beta (74%) — Alpha antes de Gama por ordem alfabética

### Requirement: Ranking deve incluir métricas consolidadas
Cada entrada do ranking DEVE incluir: posição, nome da equipe, percentual médio, soma de realizado, soma de alvo, soma de faltante.

#### Scenario: entrada de ranking contém todas as métricas
- **WHEN** ranking é calculado
- **THEN** cada entrada DEVE conter `{ posicao, nome, percentual, realizado, meta, faltante }`

### Requirement: Ranking deve expor média geral e total de participantes
O endpoint de ranking DEVE retornar `media_equipe` (média de percentual entre todas as equipes) e `total_participantes` (número de equipes no ranking).

#### Scenario: média geral calculada corretamente
- **WHEN** 3 equipes no ranking com percentuais 92, 74, 45
- **THEN** `media_equipe` DEVE ser `70.3` e `total_participantes` DEVE ser `3`
