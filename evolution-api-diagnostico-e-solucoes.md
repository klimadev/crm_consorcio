# Evolution API - Diagnostico e Solucoes (sem webhook)

## Contexto

Em algumas instancias da Evolution API, o endpoint `POST /chat/findMessages/{instance}` retorna apenas mensagens enviadas (`fromMe=true`) para um contato, enquanto em outras retorna enviadas e recebidas. Esse comportamento pode variar por instancia e sessao.

## Causas provaveis

1. Persistencia incompleta na Evolution
   - Se `DATABASE_SAVE_DATA_NEW_MESSAGE` estiver desativado, mensagens recebidas podem nao ser salvas no banco da Evolution.
   - Sem persistencia consistente, o `findMessages` fica parcial.

2. Sincronizacao inicial/historico incompleta
   - Instancias antigas ou reconectadas sem `syncFullHistory` podem ficar com historico inconsistente.

3. Variacao de identificador de conversa (`remoteJid`)
   - Alguns contatos aparecem como `@s.whatsapp.net`, outros como `@lid`.
   - Filtrar apenas por `telefone@s.whatsapp.net` pode perder mensagens recebidas que ficaram em outro JID.

4. Inconsistencia de filtros no `findMessages`
   - Em alguns cenarios/versionamentos, filtros como `where.key.fromMe=false` podem nao ser aplicados corretamente.

5. Sessao da instancia degradada
   - Cache/sessao de WhatsApp pode entrar em estado inconsistente e registrar mais outbound do que inbound.

## Objetivo

Sem usar webhook, tornar a leitura de mensagens estavel e previsivel entre instancias.

## Solucao recomendada (prioridade)

### 1) Padronizar configuracao global da Evolution

Garantir em todas as instancias/ambientes:

- `DATABASE_ENABLED=true`
- `DATABASE_SAVE_DATA_NEW_MESSAGE=true`
- `DATABASE_SAVE_MESSAGE_UPDATE=true`
- `DATABASE_SAVE_DATA_CHATS=true`
- `DATABASE_SAVE_DATA_HISTORIC=true` (recomendado para diagnostico)

Validar tambem em settings da instancia:

- `syncFullHistory=true` (ao menos durante bootstrap/migracao)

### 2) Rebootstrap das instancias irregulares

Para instancias com comportamento parcial:

1. Logout da instancia
2. Reconectar QR
3. Aplicar settings com `syncFullHistory=true`
4. Aguardar sincronizacao
5. Revalidar `findMessages`

### 3) Mudar estrategia de consulta no CRM (sem webhook)

Em vez de usar somente `remoteJid` fixo por telefone:

1. Consultar `findChats` para descobrir o JID real da conversa (incluindo `@lid`)
2. Consultar `findMessages` com esse JID real
3. Se houver mais de um candidato, consolidar por normalizacao de telefone + contexto

### 4) Nao confiar no filtro `fromMe` da Evolution

- Buscar lote de mensagens e filtrar `fromMe` no backend do CRM.
- Manter deduplicacao por `messageId`.

### 5) Backfill periodico por janela de tempo

Executar rotina periodica (ex.: a cada 10-30 min):

- `findMessages` com `messageTimestamp.gte/lte` (janela recente)
- reconciliar localmente por `messageId` e `timestamp`

Isso reduz perdas quando filtros por JID falham pontualmente.

### 6) Observabilidade por instancia

Criar indicadores simples:

- percentual de inbound (`fromMe=false`) nas ultimas N horas
- ultimo inbound por instancia
- total de mensagens por JID principal

Se inbound ficar zerado por periodo anormal, marcar instancia como degradada e executar playbook de reconexao.

### 7) Degradacao controlada na UX

Quando detectar sincronizacao parcial:

- exibir aviso: "Sincronizacao parcial desta instancia"
- evitar conclusao falsa de que o contato nao respondeu

## Playbook rapido de operacao

1. Validar env e settings da instancia
2. Testar `findChats` e confirmar JID real do contato
3. Testar `findMessages` no JID real com limite alto
4. Comparar contagem `fromMe=true` vs `fromMe=false`
5. Se parcial: reconectar + `syncFullHistory` + retestar

## Resultado esperado

Com essas medidas, mesmo sem webhook, a taxa de instancias que retornam apenas outbound deve cair significativamente, e o CRM passa a lidar melhor com variacoes de JID e inconsistencias de filtro da Evolution.
