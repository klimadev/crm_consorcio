## ADDED Requirements

### Requirement: Seleção de múltiplas instâncias WhatsApp

O exportador DEVE exibir as instâncias WhatsApp disponíveis para o usuário (considerando escopo de perfil e PDV) em um grid de cards com checkbox, permitindo seleção múltipla para exportação em lote.

#### Scenario: EMPRESA vê todas as instâncias da empresa

- **WHEN** um usuário com perfil EMPRESA acessa o WhatsApp Exporter
- **THEN** todas as instâncias WhatsApp da empresa são exibidas como cards com checkbox, mostrando nome, telefone, foto de perfil e status de conexão

#### Scenario: GERENTE vê instância do seu PDV

- **WHEN** um usuário com perfil GERENTE acessa o WhatsApp Exporter
- **THEN** apenas a instância WhatsApp associada ao seu PDV é exibida (se houver)

#### Scenario: COLABORADOR vê instância do seu PDV

- **WHEN** um usuário com perfil COLABORADOR acessa o WhatsApp Exporter
- **THEN** apenas a instância WhatsApp associada ao seu PDV é exibida (se houver)

#### Scenario: Nenhuma instância disponível

- **WHEN** o usuário não possui nenhuma instância WhatsApp acessível
- **THEN** uma mensagem "Nenhuma instância WhatsApp disponível" é exibida e o botão de exportação permanece desabilitado

#### Scenario: Selecionar instâncias para exportação

- **WHEN** o usuário marca uma ou mais instâncias e clica no checkbox de cada card
- **THEN** as instâncias selecionadas são destacadas visualmente e um contador "X selecionadas" é atualizado

### Requirement: Configuração de parâmetros de exportação

O exportador DEVE permitir configurar o número máximo de chats a buscar (1 a 1000) e o número máximo de mensagens por chat (1 a 100), com valores padrão de 500 e 30 respectivamente.

#### Scenario: Valores padrão dos parâmetros

- **WHEN** o WhatsApp Exporter é carregado pela primeira vez
- **THEN** o campo "Chats" exibe 500 e o campo "Mensagens por chat" exibe 30

#### Scenario: Validação de limites mínimos

- **WHEN** o usuário tenta definir "Chats" menor que 1 ou "Mensagens por chat" menor que 1
- **THEN** o valor é corrigido para 1

#### Scenario: Validação de limites máximos

- **WHEN** o usuário tenta definir "Chats" maior que 1000 ou "Mensagens por chat" maior que 100
- **THEN** o valor é corrigido para o máximo permitido (1000 ou 100)

#### Scenario: Botão de exportação desabilitado sem instância selecionada

- **WHEN** nenhuma instância está selecionada
- **THEN** o botão "Exportar Chats" permanece desabilitado

### Requirement: Exportação via API route

O sistema DEVE exportar o histórico de conversas através de uma API route `POST /api/dev/whatsapp-exporter` que recebe os IDs das instâncias selecionadas e os parâmetros de configuração, valida o acesso do usuário às instâncias, consulta a Evolution API para cada instância, e retorna os dumps formatados.

#### Scenario: Exportação bem-sucedida de instância única

- **WHEN** o usuário seleciona uma instância, define parâmetros válidos e clica em "Exportar Chats"
- **THEN** a API route valida a sessão, verifica que o usuário tem acesso à instância, busca os contatos da Evolution API via `buscarContatos`, para cada contato busca mensagens via `buscarMensagensPorChat`, formata o dump de texto e retorna o resultado com status "success", stats e dump formatado

#### Scenario: Exportação de múltiplas instâncias

- **WHEN** o usuário seleciona múltiplas instâncias e clica em "Exportar Chats"
- **THEN** a API route processa cada instância sequencialmente e retorna um array de resultados, um por instância

#### Scenario: Instância offline retorna erro

- **WHEN** uma das instâncias selecionadas está offline e o usuário clica em "Exportar Chats"
- **THEN** o resultado para essa instância inclui `status: "error"` com mensagem "Instância offline ou indisponível", enquanto as demais instâncias online são exportadas normalmente

#### Scenario: Usuário sem acesso à instância

- **WHEN** o payload contém um `instanceId` que não pertence à empresa ou PDV do usuário
- **THEN** a API route retorna erro 403 com mensagem "Sem permissão para acessar uma ou mais instâncias"

#### Scenario: Payload inválido

- **WHEN** o payload da requisição não atende ao schema `esquemaExportarWhatsapp` (campos ausentes ou tipos inválidos)
- **THEN** a API route retorna erro 400 com detalhes da validação Zod

### Requirement: Exibição dos resultados do export

Os resultados do export DEVE ser exibidos como seções expansíveis, uma por instância, contendo: nome da instância, estatísticas (número de chats, mensagens, período), o dump de texto formatado em bloco de código com scroll, e botões para copiar e download.

#### Scenario: Exibição de resultado bem-sucedido

- **WHEN** o export é concluído com sucesso para uma instância
- **THEN** uma seção é exibida com o nome da instância, stats (N chats, N mensagens, data início, data fim), o dump formatado em um `<pre>` com scroll, e botões "Copiar" e "Download .txt"

#### Scenario: Exibição de resultado com erro

- **WHEN** o export falha para uma instância (offline, erro Evolution, etc.)
- **THEN** uma seção é exibida com o nome da instância, status "Erro", e a mensagem de erro em texto vermelho

#### Scenario: Botão copiar

- **WHEN** o usuário clica em "Copiar" em um resultado
- **THEN** o dump de texto é copiado para a área de transferência e um toast "Copiado!" é exibido

#### Scenario: Botão download

- **WHEN** o usuário clica em "Download .txt" em um resultado
- **THEN** um arquivo `.txt` com o dump é baixado, nomeado como `whatsapp-export-{instanceName}-{data}.txt`

### Requirement: Formatação do dump de texto

O dump de texto DEVE seguir o formato: cabeçalho com metadados da instância e período, seguido de seções por chat com nome do contato e contagem de mensagens, e mensagens individuais com timestamp e direção (entrada/saída).

#### Scenario: Formato do dump

- **WHEN** um dump é gerado para uma instância
- **THEN** o texto segue o formato:
  ```
  ============================================================
  WHATSAPP CHAT HISTORY
  ============================================================
  Instance: {instance_name}
  Exported: {data_hora_utc}
  Chats: {total_chats}  |  Messages: {total_messages}  |  Period: {data_inicio} to {data_fim}
  ============================================================

  --- Chat: {pushName} | {count} mensagens ---

  [{timestamp}] {pushName}: {message_text}
  [{timestamp}] Eu: {message_text}
  ```

#### Scenario: Mensagens de mídia

- **WHEN** uma mensagem contém mídia (imagem, vídeo, áudio, documento, sticker)
- **THEN** o texto da mensagem é substituído por um marcador como "[Midia: imagem]", "[Midia: video]", "[Audio]", "[Documento]", "[Sticker]"

### Requirement: Função buscarMensagensPorChat no cliente Evolution API

O cliente Evolution API (`src/lib/evolution-api.ts`) DEVE expor uma função `buscarMensagensPorChat(instanceName, remoteJid, limite)` que busca o histórico de mensagens de um chat específico via `POST /chat/findMessages/{instanceName}` com filtro `where.key.remoteJid`.

#### Scenario: Buscar mensagens de um chat

- **WHEN** `buscarMensagensPorChat("crm_vendas_sp", "5511999999999@s.whatsapp.net", 30)` é chamada
- **THEN** a função consulta a Evolution API com o JID especificado, paginando se necessário, e retorna um array de mensagens ordenadas por timestamp, cada uma contendo `remoteJid`, `pushName`, `messageType`, `messageText`, `messageTimestamp` e `fromMe`

#### Scenario: Chat sem mensagens

- **WHEN** o chat especificado não possui mensagens
- **THEN** a função retorna um array vazio `[]`
