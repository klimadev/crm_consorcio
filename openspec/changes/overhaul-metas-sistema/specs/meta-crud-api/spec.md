## ADDED Requirements

### Requirement: API deve listar metas com suporte a filtros
A API DEVE expor `GET /api/metas` que retorna lista de metas. DEVE suportar filtros por `id_equipe`, `mes_referencia`, e `ativo` via query params. O resultado DEVE incluir progresso calculado para cada meta ativa.

#### Scenario: listar todas as metas ativas
- **WHEN** GET `/api/metas?ativo=true`
- **THEN** a resposta DEVE conter `{ metas: Meta[] }`, cada meta com `{ id, titulo, tipo_meta, origem, alvo, semana, mes_referencia, progresso }`

#### Scenario: listar metas de uma equipe específica
- **WHEN** GET `/api/metas?id_equipe=<uuid>&ativo=true`
- **THEN** a resposta DEVE conter apenas metas daquela equipe

#### Scenario: GERENTE só vê metas da própria equipe
- **WHEN** GET `/api/metas` com sessão de perfil GERENTE
- **THEN** a resposta DEVE filtrar automaticamente pelo `id_pdv` do gerente

#### Scenario: COLABORADOR não acessa metas
- **WHEN** GET `/api/metas` com sessão de perfil COLABORADOR
- **THEN** a resposta DEVE ser 403 Forbidden

### Requirement: API deve criar meta em operação única
A API DEVE expor `POST /api/metas` que cria uma meta com todos os campos necessários em 1 chamada. O alvo DEVE ser armazenado como Float. A data_inicio e data_fim DEVEM ser calculadas automaticamente se não fornecidas.

#### Scenario: criar meta com sucesso
- **WHEN** POST `/api/metas` com body `{ id_equipe: "<uuid>", tipo_meta: "VALOR", origem: "PAGAMENTOS", alvo: 25000, semana: 3, mes_referencia: "2026-06" }`
- **THEN** a resposta DEVE ser 201 com `{ meta: Meta }` incluindo progresso calculado

#### Scenario: criar meta sem equipe retorna erro
- **WHEN** POST `/api/metas` com body sem `id_equipe`
- **THEN** a resposta DEVE ser 400 com mensagem de erro

#### Scenario: criar meta duplicada no mesmo período retorna erro
- **WHEN** POST `/api/metas` para mesma equipe, mesmo `mes_referencia` e mesma `semana` de uma meta já ativa
- **THEN** a resposta DEVE ser 409 Conflict com mensagem "Já existe uma meta ativa para esta equipe nesta semana"

### Requirement: API deve permitir edição parcial de meta
A API DEVE expor `PATCH /api/metas/[id]` que permite atualizar campos parciais. A validação DEVE impedir sobreposição de períodos ao alterar semana/mês.

#### Scenario: editar alvo de meta existente
- **WHEN** PATCH `/api/metas/<id>` com body `{ alvo: 30000 }`
- **THEN** a resposta DEVE ser 200 com a meta atualizada e progresso recalculado

#### Scenario: editar semana de meta para período já ocupado
- **WHEN** PATCH `/api/metas/<id>` com body `{ semana: 3 }` e já existe meta ativa na semana 3
- **THEN** a resposta DEVE ser 409 Conflict

### Requirement: API deve permitir desativar meta
A API DEVE expor `DELETE /api/metas/[id]` que marca a meta como inativa (soft delete). Metas inativas NÃO DEVEM aparecer na listagem padrão nem no ranking.

#### Scenario: desativar meta existente
- **WHEN** DELETE `/api/metas/<id>`
- **THEN** a resposta DEVE ser 200 `{ ok: true }`

#### Scenario: tentar desativar meta já inativa
- **WHEN** DELETE `/api/metas/<id>` de meta já inativa
- **THEN** a resposta DEVE ser 404 Not Found
