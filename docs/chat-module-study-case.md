# Evolution API para Chat Completo

## Objetivo
Este documento explica como usar a Evolution API para construir um chat WhatsApp completo.

O foco é o contrato da API, os requests, os responses, a interpretação dos payloads, CTWA, `pushName`, `remoteJid`, `remoteJidAlt`, estados de mensagem, leitura e envio.

## Panorama da API

Para montar um chat completo, você precisa dominar 4 operações:

1. Consultar conexão da instância.
2. Buscar histórico de mensagens.
3. Enviar mensagens.
4. Marcar mensagens como lidas.

## Autenticação

Todas as chamadas usam:

```ts
headers: {
  "Content-Type": "application/json",
  apikey: process.env.EVOLUTION_API_KEY ?? "",
}
```

Base URL:

```ts
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
```

## Endpoints

### 1. Estado da conexão
`GET /instance/connectionState/{instance}`

#### Uso
- descobrir se a instância está online
- validar antes de enviar mensagem
- mostrar status no chat

#### Resposta típica

```json
{
  "instance": {
    "instanceName": "crm_xxx",
    "instanceId": "abc123",
    "state": "open",
    "owner": "5511999999999@s.whatsapp.net",
    "profileName": "Equipe Vendas",
    "profilePicUrl": "https://..."
  }
}
```

#### Interpretação
- `open` e `connected` indicam conexão ativa
- qualquer outro valor deve ser tratado como desconectado ou não pronto
- ausência de `state` ou `status` deve cair em `unknown`

#### Campos relevantes
- `instanceName`: nome da instância consultada
- `instanceId`: identificador interno, quando existir
- `owner`: normalmente vem em formato JID
- `profileName`: nome da conta/profilo
- `profilePicUrl`: opcional

### 2. Buscar mensagens
`POST /chat/findMessages/{instance}`

#### Uso
- carregar histórico de uma conversa
- paginar mensagens
- identificar `pushName`
- identificar CTWA

#### Request para conversa específica

```json
{
  "where": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "remoteJidAlt": "5511999999999@s.whatsapp.net"
    }
  },
  "page": 1,
  "offset": 80
}
```

#### Variação sem filtro forte

```json
{
  "page": 1,
  "offset": 500
}
```

#### Resposta paginada

```json
{
  "messages": {
    "records": [
      {
        "id": "...",
        "key": {
          "id": "BAE5F2A1B2C3D4E5",
          "fromMe": false,
          "remoteJid": "5511999999999@s.whatsapp.net",
          "remoteJidAlt": "5511999999999@s.whatsapp.net"
        },
        "pushName": "João",
        "messageType": "conversation",
        "message": {
          "conversation": "Olá"
        },
        "messageTimestamp": 1700000000,
        "contextInfo": null,
        "instanceId": "...",
        "source": "..."
      }
    ],
    "pages": 3,
    "total": 160
  }
}
```

#### Resposta simplificada

```json
[
  {
    "key": {
      "id": "...",
      "fromMe": false,
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  }
]
```

#### O que extrair
- `key.id` para deduplicação
- `key.remoteJid` para identificar o chat
- `key.remoteJidAlt` para a conversa canônica
- `fromMe` para direção
- `pushName` para nome do contato
- `messageType` + `message` para conteúdo
- `messageTimestamp` para ordenação
- `MessageUpdate` para consolidar status
- `contextInfo.externalAdReply` para CTWA

### 3. Enviar texto
`POST /message/sendText/{instance}`

#### Uso
- responder ao lead
- criar mensagem outgoing

#### Request

```json
{
  "number": "+5511999999999",
  "text": "Olá! Como posso ajudar?"
}
```

#### Resposta típica

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá! Como posso ajudar?"
    }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

#### Leitura prática
- `fromMe: true` indica mensagem enviada pela instância
- `status` pode iniciar como `PENDING`
- `messageTimestamp` pode vir como string
- o texto real pode estar em `extendedTextMessage.text`

### 4. Marcar mensagens como lidas
`POST /chat/markMessageAsRead/{instance}`

#### Uso
- sincronizar leitura no WhatsApp
- limpar badge de não lidas

#### Request

```json
{
  "readMessages": [
    {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5F2A1B2C3D4E5"
    }
  ]
}
```

#### Resposta
- muitas vezes é vazia ou mínima
- trate a chamada como best-effort

## Como interpretar os payloads

### Forma variável
A Evolution pode responder de formas diferentes:
- array direto
- `{ messages: { records: [...] } }`
- `{ records: [...] }`
- `{ data: [...] }`
- `{ result: [...] }`

### Estrutura mínima útil

```ts
{
  key: {
    id: string,
    fromMe: boolean,
    remoteJid: string,
    remoteJidAlt?: string
  },
  pushName?: string,
  messageType?: string,
  message?: Record<string, unknown>,
  messageTimestamp?: number,
  MessageUpdate?: Array<{ status: string }>,
  contextInfo?: Record<string, unknown>
}
```

### `key.id`
Identificador da mensagem. Use como chave principal para deduplicação.

### `key.remoteJid`
JID principal do chat.

Formato esperado:
- número normalizado seguido de `@s.whatsapp.net`

Exemplo:
- `5511999999999@s.whatsapp.net`

### `key.remoteJidAlt`
Em Evolution 2.3+, esse campo é muito importante.

Boa prática:
- consultar pelos dois campos
- usar `remoteJidAlt` como chave principal quando existir

### `fromMe`
Define a direção da mensagem:
- `true` => enviada pela instância
- `false` => recebida do contato

### `messageTimestamp`
Normalmente vem em segundos.

Regra prática:
- se o valor parecer pequeno, trate como segundos
- converta para milissegundos quando for formatar data

### `messageType`
Tipos comuns:
- `conversation`
- `extendedTextMessage`
- `imageMessage`
- `videoMessage`
- `audioMessage`
- `documentMessage`
- `reactionMessage`
- `locationMessage`
- `contactMessage`
- `listMessage`
- `buttonsMessage`
- `templateMessage`
- `groupInviteMessage`
- `protocolMessage`

### `message`
Onde o conteúdo real vive.

Leitura típica:
- `message.conversation` => texto simples
- `message.extendedTextMessage.text` => texto expandido
- `message.imageMessage.caption` => legenda de imagem
- `message.videoMessage.caption` => legenda de vídeo
- `message.documentMessage.fileName` => nome do arquivo

### `MessageUpdate`
Algumas respostas trazem vários status.

Use o status mais forte entre os updates.

Ordem prática:
- `ERROR`
- `READ`
- `PLAYED`
- `DELIVERED`
- `DELETED`
- `SENT`
- `PENDING`

## Como interpretar CTWA

CTWA significa Click to WhatsApp Ads.

### Onde aparece
Normalmente em:
- `contextInfo.externalAdReply`
- `messageContextInfo.externalAdReply`

### Campos mais relevantes

```ts
{
  title,
  body,
  sourceUrl,
  ctwaClid,
  thumbnailUrl,
  sourceType,
  sourceApp
}
```

### Como detectar
Um payload deve ser tratado como CTWA quando:
- `sourceType === "ad"`, ou
- `sourceUrl` contém `fb.me` ou `facebook.com`, ou
- existe `ctwaClid`

### Como usar no chat
- identificar origem do anúncio
- exibir título e corpo do anúncio
- rastrear conversão

### Exemplo de payload CTWA

```json
{
  "key": {
    "id": "BAE5...",
    "fromMe": false,
    "remoteJid": "5511999999999@s.whatsapp.net",
    "remoteJidAlt": "5511999999999@s.whatsapp.net"
  },
  "messageType": "conversation",
  "message": {
    "conversation": "Quero falar sobre o anúncio"
  },
  "contextInfo": {
    "externalAdReply": {
      "title": "Consórcio sem entrada",
      "body": "Simule agora",
      "sourceUrl": "https://facebook.com/...",
      "ctwaClid": "clid-123",
      "thumbnailUrl": "https://...",
      "sourceType": "ad",
      "sourceApp": "facebook"
    }
  }
}
```

## Como interpretar `pushName`

### O que é
`pushName` é o nome exibido no WhatsApp do outro lado da conversa.

### Regra correta
- se `fromMe: false`, o `pushName` pode ser usado como nome útil
- se `fromMe: true`, não use esse valor como nome do contato

### Estratégia confiável
1. Localize a primeira mensagem do contato.
2. Leia o `pushName` dessa mensagem.
3. Use como nome auxiliar.
4. Se estiver vazio, use fallback para telefone ou outro campo externo.

### Exemplo

```json
{
  "key": {
    "fromMe": false
  },
  "pushName": "Maria Silva"
}
```

## Como lidar com não lidas

### Detecção
Uma mensagem não lida normalmente é detectada como:

```ts
fromMe: false
```

e sem estado de leitura enviado ainda.

### Marcação
Fluxo ideal:
1. Identificar mensagens não lidas do chat.
2. Enviar `markMessageAsRead` com `readMessages`.
3. Tratar resposta como confirmação best-effort.

### Exemplo de lote

```json
{
  "readMessages": [
    { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, "id": "msg-1" },
    { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, "id": "msg-2" }
  ]
}
```

## Montando um chat completo

### Requisitos mínimos
1. Lista de conversas.
2. Busca por nome ou telefone.
3. Filtro de não lidas.
4. Abrir histórico.
5. Enviar mensagem.
6. Marcar como lida.
7. Mostrar status da conexão.
8. Suportar CTWA.

### Sequência recomendada
#### A. Carregar lista
- usar `findMessages` ou `findChats`
- agrupar por conversa
- extrair última mensagem
- calcular não lidas

#### B. Abrir conversa
- resolver `remoteJid`
- buscar histórico com `findMessages`
- filtrar apenas mensagens do contato

#### C. Enviar mensagem
- checar conexão online
- enviar via `sendText`

#### D. Marcar leitura
- chamar `markMessageAsRead`
- recalcular contador

## Boas práticas

1. Sempre consulte `remoteJid` e `remoteJidAlt`.
2. Normalize telefone antes de montar o JID.
3. Nunca assuma que o retorno virá em um único shape.
4. Faça parser tolerante para `messages.records`, `records`, `data` e `result`.
5. Trate `messageTimestamp` como segundos na dúvida.
6. Extraia texto por tipo de mídia, não apenas por `conversation`.
7. Detecte CTWA pelo `externalAdReply`.
8. Preserve o status mais forte ao consolidar mensagens.
9. Faça deduplicação por `key.id`.

## Snippets de uso

### Buscar mensagens

```ts
const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    where: {
      key: {
        remoteJid: jid,
        remoteJidAlt: jid,
      },
    },
    page: 1,
    offset: 80,
  }),
});

const json = await resposta.json();
const records = json.messages?.records ?? json.records ?? json.data ?? json.result ?? [];
```

### Extrair texto

```ts
const message = raw.message;
const texto =
  typeof message?.conversation === "string"
    ? message.conversation
    : typeof message?.extendedTextMessage?.text === "string"
      ? message.extendedTextMessage.text
      : typeof message?.imageMessage?.caption === "string"
        ? message.imageMessage.caption
        : "";
```

### Detectar CTWA

```ts
const ad = raw.contextInfo?.externalAdReply ?? raw.messageContextInfo?.externalAdReply;
const ehCtwa =
  ad?.sourceType === "ad" ||
  String(ad?.sourceUrl ?? "").includes("facebook.com") ||
  String(ad?.sourceUrl ?? "").includes("fb.me") ||
  Boolean(ad?.ctwaClid);
```

### Escolher nome do contato

```ts
const nome = !raw.key?.fromMe && typeof raw.pushName === "string" && raw.pushName.trim()
  ? raw.pushName.trim()
  : telefone;
```

## Estudo de caso

### Cenário
Um lead clica em um anúncio CTWA, conversa no WhatsApp e o time responde pelo CRM.

### O que acontece no payload
1. A mensagem de entrada chega com `fromMe: false`.
2. O payload traz `externalAdReply` com contexto do anúncio.
3. `pushName` pode vir preenchido e é usado como nome auxiliar.
4. O histórico é buscado por `remoteJid` e `remoteJidAlt`.
5. Ao abrir o chat, o sistema calcula não lidas.
6. Ao ler, chama a Evolution para marcar como lido.

### Resultado final
- histórico carregado
- origem CTWA identificada
- nome do contato enriquecido por `pushName`
- leitura sincronizada
- envio de mensagens com status progressivo

## Codemap conceitual

### Entrada
- telefone do contato
- instância WhatsApp

### Processamento
- normalização de JID
- chamada `findMessages`
- interpretação do payload
- extração de texto
- detecção de CTWA
- leitura de `pushName`
- consolidação de status

### Saída
- mensagens canônicas
- contador de não lidas
- status de conexão
- metadados do anúncio
- nome do contato

## Referências técnicas

- Evolution API
- WhatsApp Baileys
- `GET /instance/connectionState/{instance}`
- `POST /chat/findMessages/{instance}`
- `POST /message/sendText/{instance}`
- `POST /chat/markMessageAsRead/{instance}`

## Resumo prático

Se a meta é fazer um `/chat` completo igual ao WhatsApp, a regra é esta:

- use `remoteJid` e `remoteJidAlt` como base de identidade
- leia `pushName` como dado auxiliar
- interprete CTWA via `externalAdReply`
- normalize todo payload antes de consumir
- trate não lidas via `markMessageAsRead`
- mantenha a UI otimista e tolerante a falhas
