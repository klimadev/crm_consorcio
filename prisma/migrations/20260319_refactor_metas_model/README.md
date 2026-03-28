# Estrategia de backfill - refatoracao de metas

## Objetivo

Preservar o historico das metas legadas enquanto a nova estrutura baseada em template + periodo passa a coexistir com a tabela `Meta` atual.

## Abordagem

1. Manter `Meta` como origem legada durante a transicao.
2. Criar `MetaTemplate` para guardar configuracao recorrente e semantica nova.
3. Criar `MetaPeriodo` para representar ocorrencias concretas de mes, trimestre, ano e semana 1-4 do mes.
4. Adaptar `MetaProgresso` para aceitar progresso por `id_meta` legado e por `id_meta_periodo` novo.

## Backfill inicial recomendado

1. Para cada registro existente em `Meta`, criar um `MetaPeriodo` espelho:
   - `id_empresa` = `Meta.id_empresa`
   - `id_meta_legada` = `Meta.id`
   - `periodo_tipo` = mapear `SEMANAL`, `MENSAIS`, `TRIMESTRAL`, `ANUAL`
   - `periodo_label` = string legivel do periodo
   - `ano`, `mes`, `trimestre` = derivados de `data_inicio`
   - `semana_do_mes` = derivada da regra comercial 1-7, 8-14, 15-21, 22-fim quando aplicavel
   - `alvo`, `data_inicio`, `data_fim`, `ativo` = copiar da meta legada
2. Opcionalmente criar um `MetaTemplate` simples para cada meta legada ativa:
   - `cadencia` espelha o periodo
   - `recorrencia` = `PONTUAL`
   - `origem_resultado` = `PAGAMENTOS`
3. Associar `Meta.periodo_refId` ao `MetaPeriodo` criado quando o backfill for executado.
4. Manter os endpoints legados lendo `Meta` ate a camada de dominio ser migrada.

## Regras comerciais

- Semana 1 = dias 1-7
- Semana 2 = dias 8-14
- Semana 3 = dias 15-21
- Semana 4 = dias 22-fim do mes
- Meses com quinta semana parcial continuam na semana 4

## Garantias

- Nenhum hard delete de historico legado
- Compatibilidade gradual entre UI/API antigas e novas
- Possibilidade de rollback logico mantendo `Meta` intacta durante o rollout
