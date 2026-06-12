## Why

O sistema de metas atual está espalhado em 3 tabelas (Meta, MetaTemplate, MetaPeriodo) com 5 bugs de cálculo que corroem a confiança do cliente. Cada equipe não consegue definir uma meta semanal de forma óbvia, o ranking duplica entradas, e o resumo mostra métricas enganosas. Um overhaul completo — simplificação conceitual, correção dos bugs, UX redesenhada — é necessário para entregar previsibilidade ao cliente e base sólida para evoluções futuras.

## What Changes

- **Unificação do modelo**: 3 tabelas (Meta + MetaTemplate + MetaPeriodo) → 1 tabela `Meta`, com `titulo`, `tipo_meta`, `origem`, `alvo`, `semana`, `mes_referencia`, `id_equipe`
- **Criação de motor de cálculo puro**: `calculator.ts` — funções determinísticas sem dependência de Prisma, testáveis em isolamento
- **Correção de 5 bugs críticos/altos**: duplicidade no ranking, UTC vs Local, dupla contagem, semana do mês inconsistente, resumo por meta vs equipe
- **Nova API REST simplificada**: endpoints que operam sobre 1 tabela, sem transação em 3 passos
- **Nova UX de criação em 2 passos**: equipe + alvo (antes 7 campos, 3 conceitos)
- **Grade visual semanal**: cada equipe vê suas semanas lado a lado com status 🟢🟡🔴
- **Remoção de código legado**: `MetaTemplate`, `MetaPeriodo`, `MetaProgresso` e `montarResumoTetos`
- **Migração de dados**: script para transportar registros ativos do modelo legado para o novo

## Capabilities

### New Capabilities
- `meta-calculator`: Motor de cálculo puro e determinístico para progresso de metas, sem dependência de banco. Funções: `calcularProgresso`, `calcularRanking`, `obterCompetencia`, `calcularDiasRestantes`
- `meta-crud-api`: API REST simplificada sobre a tabela unificada Meta. Endpoints: GET /api/metas (listar), POST /api/metas (criar em 1 etapa), PATCH /api/metas/[id], DELETE /api/metas/[id]
- `meta-creation-wizard-2step`: UX de criação de meta em 2 passos (equipe → alvo), com data calculada automaticamente pela semana corrente
- `meta-week-grid`: Grade visual semanal por equipe, com cards de semana, status colorido, edição inline e arquivamento
- `meta-ranking-fixed`: Ranking de equipes deduplicado (1 PDV = 1 entrada), com agregação por média ponderada

### Modified Capabilities
- *(nenhuma — spec nova, sem alteração em specs existentes)*

## Impact

- **Prisma schema**: modelo Meta simplificado, remoção de MetaTemplate / MetaPeriodo / MetaProgresso (ou desativação)
- **API routes**: `src/app/api/metas/*` reescritas para operar sobre tabela unificada; rotas legadas de template/período removidas
- **Módulo de equipe**: `src/modules/equipe/components/metas/*` substituído por `src/modules/metas/*`
- **Lib de cálculo**: `src/lib/metas.ts` removido; substituído por `src/modules/metas/lib/calculator.ts`
- **Hook**: `use-metas-module.ts` simplificado, sem lidar com 3 entidades
- **Migração**: script único `prisma/migrations/overhaul_metas.sql` + script Node de transporte de dados
- **5 bugs corrigidos**: alterações localizadas no motor de cálculo e nas queries de agregação
