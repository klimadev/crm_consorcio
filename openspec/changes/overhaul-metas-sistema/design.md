## Context

O sistema de metas do CRM Consórcio está implementado em 3 tabelas Prisma (Meta, MetaTemplate, MetaPeriodo) mais uma tabela de progresso calculado (MetaProgresso). A lógica de cálculo está acoplada ao Prisma, impossibilitando testes unitários. A UX exige que o cliente preencha 7 campos e entenda 3 conceitos para criar uma meta. O ranking duplica entradas do mesmo PDV e o resumo conta metas em vez de equipes.

## Goals / Non-Goals

**Goals:**
- Unificar o modelo de dados em 1 tabela (Meta) com campos diretos
- Extrair motor de cálculo para funções puras e testáveis (calculator.ts)
- Corrigir os 5 bugs identificados (ranking, UTC, dupla contagem, semana mês, resumo)
- Redesenhar UX de criação: 2 passos (equipe → alvo) com datas automáticas
- Grade visual semanal: cada equipe = linha, semanas = colunas, status = cor
- API REST simplificada: 1 chamada = 1 operação na tabela Meta
- Migração automática de dados legados para o novo schema
- Workflow multi-agente paralelizável: cada capability executa independente (sem worktree)

**Non-Goals:**
- Não altera o modelo de PDV, perfil de usuário ou sessão
- Não introduz novos tipos de meta além de VALOR_PAGAMENTOS, VALOR_FECHADOS, VOLUME_FECHADOS
- Não altera o sistema de permissões (EMPRESA/GERENTE/COLABORADOR)
- Não introduz cache distribuído
- Não altera o esquema de autenticação (JWT)
- Não refatora o módulo de equipe além das metas

## Decisions

### D1 — Tabela unificada em vez de tabelas separadas
**Decisão:** Criar nova tabela Meta com todos os campos, migrar dados legados, marcar tabelas antigas como deprecated
**Alternativa:** Manter 3 tabelas e adicionar views — rejeitada porque não resolve a complexidade acidental
**Por que:** Cliente leigo pensa em "meta = {equipe, valor, semana}". 3 tabelas é vazamento de implementação

### D2 — Motor de cálculo puro (calculator.ts) sem Prisma
**Decisão:** `calcularProgresso(meta, { pagamentos, leads })` recebe dados prontos, retorna resultado. A camada de API busca os dados e chama o motor
**Alternativa:** Manter cálculo dentro do Prisma aggregate — rejeitada por ser intestável e acoplada
**Por que:** Testes unitários sem mock de banco, portabilidade, correção dos bugs de UTC

### D3 — Grade semanal como grid de colunas fixas (S1-S4 do mês)
**Decisão:** Exibir sempre 4 colunas de semana por equipe, com slot vazio para semanas sem meta
**Alternativa:** Lista vertical de metas — rejeitada porque o cliente quer ver o mês inteiro de uma vez
**Por que:** Visibilidade horizontal permite comparar semanas sem scroll vertical

### D4 — Criação em 2 steps com datas automáticas
**Decisão:** Step 1: equipe + tipo/target. Step 2: preview com datas calculadas pela semana corrente. Cliente só confirma.
**Alternativa:** Formulário com 7 campos livres — rejeitada pela alta taxa de erro
**Por que:** 80% das metas são "esta semana, este valor". A data deve ser calculada, não preenchida

### D5 — Sem worktree, paralelismo via pipeline de capacidades independentes
**Decisão:** Cada capability (calculator, crud-api, wizard, week-grid, ranking) é implementável independentemente porque dependem apenas de interfaces contratuais (tipos, schema Prisma, calculator.ts exports)
**Alternativa:** Worktree por agente — rejeitada porque o setup é caro para este escopo
**Por que:** O schema Prisma é o contrato compartilhado; calculator.ts importa tipos, não banco; cada capability pode ser testada isoladamente

## Risks / Trade-offs

- **[Migração]** Dados existentes com 3 tabelas → 1 tabela: risco de perda de histórico → **Mitigação:** script idempotente com validação prévia e rollback via backup
- **[Paralelismo]** Múltiplos agentes editando o mesmo schema Prisma → **Mitigação:** schema editado primeiro (Fase 0), depois agentes trabalham em paralelo sem conflito
- **[Regressão de cálculo]** Novo motor pode divergir do legado → **Mitigação:** testes comparativos (parallel run) na Fase 4 antes de remover código antigo
- **[UX nova]** Cliente acostumado com formulário antigo pode estranhar → **Mitigação:** manter diálogo antigo como fallback por 1 sprint
- **[UTC padronizado]** Clientes em fusos muito negativos (GMT-5) podem ver datas deslocadas → **Trade-off aceito:** é melhor que o bug atual de inconsistência entre componentes
