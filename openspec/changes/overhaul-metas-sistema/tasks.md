## 1. Fundação — Schema + Tipos + Calculator

- [x] 1.0 Criar `prisma/migrations/overhaul_metas.sql` com nova tabela Meta (id, id_empresa, titulo, tipo_meta, origem, alvo, semana, mes_referencia, data_inicio, data_fim, ativo, id_equipe, criado_em, atualizado_em)
- [x] 1.1 Adicionar model MetaNova ao schema.prisma com campos unificados (Meta, MetaTemplate, MetaPeriodo, MetaProgresso marcados como @@ignore)
- [x] 1.2 Criar `src/modules/metas/types/index.ts` com tipos compartilhados: Meta, ProgressoMeta, RitmoStatus, MetaFormData, RankingItem, ResumoMetas
- [x] 1.3 Criar `src/modules/metas/lib/dates.ts` com funções UTC padronizadas: `startOfDayUTC`, `endOfDayUTC`, `obterCompetenciaISO`, `calcularDiasRestantes`
- [x] 1.4 Criar `src/modules/metas/lib/calculator.ts` com funções puras: `calcularProgresso`, `calcularRanking`, `agregarProgressoEquipe`, `percentualSeguro`, `obterStatusPorPercentual`

## 2. API REST Simplificada

- [x] 2.1 Re-escrever `src/app/api/metas/route.ts` (GET) para listar metas da tabela unificada com filtros (id_equipe, mes_referencia, ativo) e progresso calculado via calculator.ts
- [x] 2.2 Re-escrever `src/app/api/metas/route.ts` (POST) para criar meta em 1 chamada com validação de unicidade por equipe+semana
- [x] 2.3 Re-escrever `src/app/api/metas/[id]/route.ts` (PATCH) para edição parcial com validação de conflito de período
- [x] 2.4 Re-escrever `src/app/api/metas/[id]/route.ts` (DELETE) para soft delete da meta
- [x] 2.5 Criar `src/app/api/metas/ranking/route.ts` com agregação por equipe (1 PDV = 1 linha), média de percentuais, suporte a filtro por periodo

## 3. Client API + Hook

- [x] 3.0 Criar `src/modules/metas/api/metas.ts` com funções fetch tipadas: listarMetas, criarMeta, editarMeta, desativarMeta, obterRanking
- [x] 3.1 Re-escrever `src/modules/metas/hooks/use-metas-module.ts` simplificado: 1 estado plano, sem referência a 3 entidades, consumindo API unificada
- [x] 3.2 Implementar resumo correto no hook: agrupar por equipe (não por meta) para contagem de ritmo

## 4. Wizard de Criação (2 Passos)

- [x] 4.0 Criar `src/modules/metas/components/meta-create-sheet.tsx` — sheet modal com Step 1 (equipe + tipo + alvo) e Step 2 (preview + confirmar)
- [x] 4.1 Implementar cálculo automático de datas: data_inicio = segunda da semana, data_fim = domingo
- [x] 4.2 Implementar estados: carregando (placeholder), erro (InlineStatusAlert), sucesso (toast + fecha), conflito (mensagem + mantém dados)

## 5. Grade Semanal (Week Grid)

- [x] 5.0 Criar `src/modules/metas/components/meta-week-card.tsx` — card individual por semana: percentual grande, status badge, realizado vs alvo, botões editar/arquivar
- [x] 5.1 Criar `src/modules/metas/components/meta-week-grid.tsx` — grid de 4 colunas por equipe (S1-S4), slot vazio clicável, legenda de cores
- [x] 5.2 Criar `src/modules/metas/components/metas-header.tsx` — cabeçalho com métricas de resumo (semanas visíveis, saudáveis, média) e seletor de equipe (EMPRESA) ou badge fixo (GERENTE)

## 6. Ranking Corrigido

- [x] 6.0 Criar `src/modules/metas/components/meta-ranking.tsx` — lista de ranking por equipe com posição, nome, percentual, valores realizados vs alvo
- [x] 6.1 Implementar agrupamento: 1 linha por equipe (antes duplicava por meta)
- [x] 6.2 Mostrar média geral e total de participantes no header

## 7. Página Principal + Integração

- [x] 7.0 Criar `src/modules/metas/metas-page.tsx` — page shell que monta Header + WeekGrid + Ranking + Wizard
- [x] 7.1 Conectar página em `src/app/(dashboard)/equipe/metas/page.tsx` (substituindo ModuloMetasEquipe antigo)
- [ ] 7.2 Substituir imports antigos `@/modules/equipe/components/metas` → `@/modules/metas` (módulo legado mantido para fallback)

## 8. Migração de Dados + Limpeza

- [x] 8.0 Criar `prisma/migrations/migrate_metas_legadas.sql` — script SQL que transporta dados ativos de Meta + MetaPeriodo + MetaTemplate para nova tabela Meta
- [x] 8.1 Criar `scripts/migrate-metas.ts` — script Node com validação pré-migração e log de divergências
- [ ] 8.2 Remover `src/lib/metas.ts` após confirmação de que novo motor está em produção (pendenciado — depende de validação em produção)
- [ ] 8.3 Remover arquivos legados: `meta-creation-wizard.tsx`, `meta-form-dialog.tsx`, `meta-admin-panel.tsx` (pendenciado — manter fallback 1 sprint)

## 9. Testes + Validação Final

- [x] 9.0 Testes unitários do calculator.ts e dates.ts (36 testes, cobre 5 bugs + datas UTC + cálculo de progresso)
- [ ] 9.1 Rodar migração em paralelo com sistema legado e comparar resultados por 1 ciclo (pendenciado — requer execução manual em produção)
- [ ] 9.2 Remover `docs/apresentacao-overhaul-metas.md` (arquivo não encontrado — já removido ou nunca existiu)
