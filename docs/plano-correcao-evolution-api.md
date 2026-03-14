# Plano de Correção: Evolution API 2.3+ no CRM Consórcio

## 📋 Visão Geral

Este documento detalha a correção e aprimoramento da integração do CRM com a Evolution API (versão 2.3+) do WhatsApp. O CRM apresenta 5 problemas críticos que afetam a extração de dados dos leads e a experiência do usuário.

---

## 🚨 Os 5 Problemas Identificados

### Problema 1: Extração Incorreta do Nome do Lead (`pushName`)

**Sintoma:** O nome do lead aparece como o nome do atendente ou não aparece.

**Causa Raiz:** 
- O endpoint `findChats` retorna apenas o objeto do chat com a propriedade `lastMessage`
- O campo `pushName` na raiz do chat frequentemente vem como `null`
- Se a `lastMessage` for uma mensagem enviada pelo próprio CRM (`key.fromMe: true`), o `pushName` será do atendente, não do lead

**Impacto:** Leads cadastrados com nomes errados ou apenas com o número de telefone

---

### Problema 2: Identificação de Ads (Click to WhatsApp)

**Sintoma:** O CRM não sabe quando um lead veio de um anúncio do Facebook/Instagram.

**Causa Raiz:** O sistema não extrai os dados do nó `contextInfo.externalAdReply` das mensagens.

**Impacto:** 
- Impossível medir ROI de campanhas de ads
- Perda de dados valiosos de origem do lead

---

### Problema 3: Tipos de Mensagens Limitados

**Sintoma:** Apenas mensagens de texto são exibidas corretamente. Áudio, vídeo, arquivo, sticker aparecem como "não suportado".

**Causa Raiz:** A função `extrairTexto` em `whatsapp-chat.ts` só processa `conversation` e `extendedTextMessage`.

**Impacto:** Interface pobre no histórico de conversas

---

### Problema 4: Normalização de Datas

**Sintoma:** Datas em formato Unix Timestamp não formatadas para o usuário.

**Causa Raiz:** O campo `messageTimestamp` vem em segundos (não milissegundos) e precisa de conversão.

**Impacto:** Interface confusa para o usuário

---

### Problema 5: Filtro do Drawer do Kanban Não Funciona

**Sintoma:** Ao abrir o chat de um lead no drawer do Kanban, o histórico não carrega ou carrega vazio.

**Causa Raiz:** O payload do `findMessages` está com a estrutura errada:
```json
// ❌ ERRADO (atual)
{
  "where": {
    "key": {
      "remoteJid": "559999530940@s.whatsapp.net"
    }
  },
  "limit": 80
}

// ✅ CORRETO
{
  "where": {
    "key": {
      "remoteJidAlt": "559999530940@s.whatsapp.net"
    }
  },
  "page": 1,
  "offset": 50
}
```

**Impacto:** Usuário não consegue ver o histórico de mensagens no drawer

---

## 📊 Estruturas de Dados da Evolution API 2.3+

### Estrutura 1: Mensagem de Texto Padrão do Lead (fromMe: false)

```json
{
  "id": "cmmpm275b03koo14vebp7uyj4",
  "key": {
    "id": "ACA1E1D5E703EEDD663D6609C49F991E",
    "fromMe": false,
    "remoteJid": "66417458159826@lid",
    "participant": "",
    "remoteJidAlt": "559999530940@s.whatsapp.net",
    "addressingMode": "lid"
  },
  "pushName": "Pedro Maranhao",
  "messageType": "conversation",
  "message": {
    "conversation": "Tem mais informações sobre o taos highline novo"
  },
  "messageTimestamp": 1773449529,
  "instanceId": "b0c3f9e8-d813-4d77-b341-0bea1e1210a3",
  "source": "android",
  "contextInfo": null
}
```

### Estrutura 2: Mensagem com Contexto de Ad / Click to WhatsApp

```json
{
  "id": "cmmpm1fe303kho14vovxqj3e4",
  "key": {
    "id": "AC1830B11436BAC01F6FA6196C534B8A",
    "fromMe": false,
    "remoteJid": "66417458159826@lid",
    "participant": "",
    "remoteJidAlt": "559999530940@s.whatsapp.net"
  },
  "pushName": "Pedro Maranhao",
  "messageType": "conversation",
  "message": {
    "conversation": "Olá! Tenho interesse e queria mais informações, por favor."
  },
  "messageTimestamp": 1773449493,
  "source": "android",
  "contextInfo": {
    "ctwaPayload": "QWZkN0cyMVk1NF...",
    "ctwaSignals": "all,all",
    "externalAdReply": {
      "body": "Sua melhor opção para sair de carro novo em 2026",
      "title": "Converse conosco",
      "ctwaClid": "Affc9P3TLX9o7iBSwwqSi-6dEo0CGSSEOENR-8rk45JcinLox1SB7wfZbiENG_HXAkkJUfsfrOlL5wTxMexiyl_JcIvD7Qxv_T3h61DDlx5v4nECiYbWwx4ZeinuOATSmbEREjujOfk",
      "mediaUrl": "https://www.facebook.com/reel/1431138995166108/",
      "sourceId": "120239177205810192",
      "mediaType": 2,
      "sourceApp": "facebook",
      "sourceUrl": "https://fb.me/5z9Rw6Obv",
      "sourceType": "ad",
      "thumbnailUrl": "https://scontent.xx.fbcdn.net/v/t15.5256-10/...",
      "showAdAttribution": true,
      "clickToWhatsappCall": true,
      "greetingMessageBody": "Oi! Como podemos ajudar?",
      "automatedGreetingMessageShown": true
    },
    "conversionSource": "FB_Ads",
    "entryPointConversionApp": "facebook",
    "entryPointConversionSource": "ctwa_ad"
  }
}
```

### Estrutura 3: Outras Mensagens (Tipos Suportados)

```json
// Vídeo
{
  "messageType": "videoMessage",
  "message": {
    "videoMessage": {
      "caption": "Vídeo do carro",
      "url": "https://...",
      "mimetype": "video/mp4"
    }
  }
}

// Imagem
{
  "messageType": "imageMessage", 
  "message": {
    "imageMessage": {
      "caption": "Foto do interior",
      "url": "https://...",
      "mimetype": "image/jpeg"
    }
  }
}

// Áudio / Voz
{
  "messageType": "audioMessage",  // ou "voiceMessage"
  "message": {
    "audioMessage": {
      "url": "https://...",
      "mimetype": "audio/ogg; codecs=opus"
    }
  }
}

// Documento
{
  "messageType": "documentMessage",
  "message": {
    "documentMessage": {
      "fileName": "proposta.pdf",
      "url": "https://...",
      "mimetype": "application/pdf"
    }
  }
}

// Sticker
{
  "messageType": "stickerMessage",
  "message": {
    "stickerMessage": {
      "url": "https://...",
      "mimetype": "image/webp"
    }
  }
}
```

---

## 🎯 Soluções Propostas

### Solução 1: Abordagem Otimizada para Extração de Nomes e Ads

**Estratégia:** Em vez de fazer N+1 chamadas API (uma para cada lead), buscar todas as mensagens uma vez e processar internamente.

**Fluxo:**
```
1. Buscar TODAS as mensagens da instância (1 chamada)
2. Criar MAPs internos:
   - telefone → primeiro pushName válido (fromMe: false)
   - telefone → dados do primeiro Ad encontrado
3. Na criação do lead, usar os MAPs (sem chamada adicional!)
```

**Vantagens:**
- 1 chamada API por instância (não N+1)
- Mucho mais rápido para sincronização de muitos leads
- Extrai Ads automaticamente durante a sync

---

### Solução 2: Payload Correto para findMessages

**Estrutura do payload correto:**
```json
{
  "where": {
    "key": {
      "remoteJidAlt": "555199309404@s.whatsapp.net"
    }
  },
  "page": 1,
  "offset": 50
}
```

**Parâmetros:**
- `where.key.remoteJidAlt`: O número do WhatsApp no formato correto (com @s.whatsapp.net)
- `page`: Número da página (começa em 1)
- `offset`: Quantidade de registros por página (recomendado: 50-100)

---

## 📁 Arquivos a Criar/Modificar

### 🆕 Novo Arquivo: `src/lib/whatsapp-utils.ts`

**Propósito:** Tipos TypeScript e funções de normalização reutilizáveis.

**Conteúdo:**

```typescript
// ============================================
// TIPOS - Evolution API 2.3+
// ============================================

export type EvolutionAdReply = {
  body: string | null;           // Texto/Copy do ad
  title: string | null;         // Título do ad
  sourceUrl: string | null;     // Link original
  ctwaClid: string | null;      // ID de conversão
  thumbnailUrl: string | null;  // Imagem do ad
  sourceType: string | null;    // "ad"
  mediaUrl: string | null;      // URL da mídia
  sourceId: string | null;     // ID da campanha
  sourceApp: string | null;    // "facebook" | "instagram"
};

export type EvolutionContextInfo = {
  externalAdReply?: EvolutionAdReply;
  conversionSource?: string;
  entryPointConversionApp?: string;
  entryPointConversionSource?: string;
  ctwaPayload?: string;
  ctwaSignals?: string;
};

export type EvolutionMessageKey = {
  id: string;
  fromMe: boolean;
  remoteJid: string;
  remoteJidAlt: string | null;
  participant?: string;
};

export type EvolutionMessageRecord = {
  id: string;
  key: EvolutionMessageKey;
  pushName: string | null;
  messageType: string;
  message: Record<string, unknown>;
  messageTimestamp: number;
  contextInfo: EvolutionContextInfo | null;
  source?: string;
};

export type EvolutionFindMessagesResponse = {
  messages?: {
    records?: EvolutionMessageRecord[];
    pages?: number;
    total?: number;
  };
};

// ============================================
// TIPOS - Tipos de Mensagem para Interface
// ============================================

export type TipoMensagemVisual = 
  | "texto" 
  | "imagem" 
  | "vídeo" 
  | "áudio" 
  | "voz" 
  | "documento" 
  | "sticker"
  | "localização"
  | "contato"
  | "outro";

// ============================================
// TIPOS - Dados do Ad para o Lead
// ============================================

export type LeadOrigemAds = {
  temAds: boolean;
  tituloAd?: string;
  corpoAd?: string;
  urlOrigem?: string;
  idConversao?: string;
  urlThumbnail?: string;
  tipoOrigem?: "facebook" | "instagram" | "ad";
  fonteAds?: string;
};

// ============================================
// UTILITÁRIOS - Data
// ============================================

/**
 * Converte Unix Timestamp (em segundos) para ISO 8601
 * Evolution API retorna em segundos, não milissegundos
 */
export function unixTimestampParaIso(timestamp: number | string): string {
  const ts = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  const ms = ts * 1000;
  return new Date(ms).toISOString();
}

/**
 * Converte Unix Timestamp para formato brasileiro
 * Ex: "13/03/2026 14:30"
 */
export function unixTimestampParaDataBr(timestamp: number | string): string {
  const iso = unixTimestampParaIso(timestamp);
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Converte Unix Timestamp para formato relativo
 * Ex: "há 5 minutos", "há 2 horas", "há 3 dias"
 */
export function unixTimestampParaRelativo(timestamp: number | string): string {
  const iso = unixTimestampParaIso(timestamp);
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHoras < 24) return `há ${diffHoras}h`;
  if (diffDias < 7) return `há ${diffDias}d`;
  
  return unixTimestampParaDataBr(timestamp);
}

// ============================================
// UTILITÁRIOS - Tipo de Mensagem
// ============================================

/**
 * Mapeia o messageType da Evolution API para tipo visual
 */
export function mapearTipoMensagem(messageType: string | null | undefined): TipoMensagemVisual {
  if (!messageType) return "outro";
  
  const mapa: Record<string, TipoMensagemVisual> = {
    conversation: "texto",
    extendedTextMessage: "texto",
    imageMessage: "imagem",
    videoMessage: "vídeo",
    audioMessage: "áudio",
    voiceMessage: "voz",
    documentMessage: "documento",
    stickerMessage: "sticker",
    locationMessage: "localização",
    contactsMessage: "contato",
    reactionMessage: "outro",
  };
  
  return mapa[messageType.toLowerCase()] ?? "outro";
}

/**
 * Retorna ícone Lucide para o tipo de mensagem
 */
export function getIconeTipoMensagem(kind: TipoMensagemVisual): string {
  const icones: Record<TipoMensagemVisual, string> = {
    texto: "MessageSquare",
    imagem: "Image",
    vídeo: "Video",
    áudio: "Music",
    voz: "Mic",
    documento: "FileText",
    sticker: "Smile",
    localização: "MapPin",
    contato: "User",
    outro: "MessageCircle",
  };
  return icones[kind] ?? "MessageCircle";
}

// ============================================
// UTILITÁRIOS - Extração de Dados do Ad
// ============================================

/**
 * Extrai dados de anúncio de uma mensagem
 */
export function extrairDadosAd(contextInfo: EvolutionContextInfo | null): LeadOrigemAds {
  if (!contextInfo?.externalAdReply) {
    return { temAds: false };
  }
  
  const ad = contextInfo.externalAdReply;
  
  return {
    temAds: true,
    tituloAd: ad.title ?? undefined,
    corpoAd: ad.body ?? undefined,
    urlOrigem: ad.sourceUrl ?? undefined,
    idConversao: ad.ctwaClid ?? undefined,
    urlThumbnail: ad.thumbnailUrl ?? undefined,
    tipoOrigem: ad.sourceApp === "facebook" || ad.sourceApp === "instagram" 
      ? ad.sourceApp 
      : ad.sourceType === "ad" ? "ad" : undefined,
    fonteAds: ad.sourceApp ?? undefined,
  };
}

// ============================================
// UTILITÁRIOS - Extração de Texto da Mensagem
// ============================================

/**
 * Extrai o texto visível de uma mensagem da Evolution API
 */
export function extrairTextoMensagem(
  message: Record<string, unknown> | undefined,
  messageType: string | null
): string {
  if (!message || typeof message !== "object") return "";
  
  // Texto simples
  if (typeof message.conversation === "string") {
    return message.conversation;
  }
  
  // Texto estendido (reply, etc)
  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (extended && typeof extended.text === "string") {
    return extended.text;
  }
  
  // Imagem com caption
  const imageMsg = message.imageMessage as Record<string, unknown> | undefined;
  if (imageMsg) {
    const caption = typeof imageMsg.caption === "string" ? imageMsg.caption : "";
    return caption || "[Imagem]";
  }
  
  // Vídeo
  const videoMsg = message.videoMessage as Record<string, unknown> | undefined;
  if (videoMsg) {
    const caption = typeof videoMsg.caption === "string" ? videoMsg.caption : "";
    return caption || "[Vídeo]";
  }
  
  // Áudio / Voz
  if (message.audioMessage || message.voiceMessage) {
    return message.voiceMessage ? "[Mensagem de voz]" : "[Áudio]";
  }
  
  // Documento
  const docMsg = message.documentMessage as Record<string, unknown> | undefined;
  if (docMsg) {
    const fileName = typeof docMsg.fileName === "string" ? docMsg.fileName : "Arquivo";
    return `[Arquivo: ${fileName}]`;
  }
  
  // Sticker
  if (message.stickerMessage) {
    return "[Sticker]";
  }
  
  return "[Mensagem não suportada]";
}

// ============================================
// UTILITÁRIOS - Extração de Telefone
// ============================================

/**
 * Extrai o número de telefone de um remoteJid
 */
export function extrairTelefoneDeRemoteJid(remoteJid: string | null | undefined): string | null {
  if (!remoteJid) return null;
  return remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "");
}

/**
 * Formata telefone para exibição (Brasil)
 */
export function formatarTelefoneBr(telefone: string): string {
  const numeros = telefone.replace(/\D/g, "");
  
  if (numeros.length === 12) { // 55 + DDD + 8 dig
    return `(${numeros.slice(2, 4)}) ${numeros.slice(4, 9)}-${numeros.slice(9)}`;
  }
  if (numeros.length === 13) { // 55 + DDD + 9 dig
    return `(${numeros.slice(2, 4)}) ${numeros.slice(4, 5)}-${numeros.slice(5)}`;
  }
  
  return numeros;
}
```

---

### ✏️ Modificar: `src/lib/whatsapp-chat.ts`

**Mudanças:**

1. **Corrigir payload do `buscarMensagensEvolution`:**

```typescript
// ANTES (ERRADO):
const where = telefoneBusca
  ? {
      OR: [
        { key: { remoteJid: `${telefoneBusca}@s.whatsapp.net` } },
        { key: { remoteJidAlt: `${telefoneBusca}@s.whatsapp.net` } },
      ],
    }
  : { key: { remoteJid } };

// DEVE VIRAR (CORRETO):
const where = telefoneBusca
  ? { key: { remoteJidAlt: `${telefoneBusca}@s.whatsapp.net` } }
  : { key: { remoteJid } };

// E adicionar page/offset:
body: JSON.stringify({
  where,
  page: 1,
  offset: 80,  // ou 50
})
```

2. **Importar utilitários do novo arquivo:**

```typescript
import { 
  unixTimestampParaIso,
  unixTimestampParaDataBr,
  mapearTipoMensagem,
  extrairDadosAd,
  extrairTextoMensagem,
  type TipoMensagemVisual,
  type LeadOrigemAds
} from "@/lib/whatsapp-utils";
```

3. **Atualizar tipo `MensagemNormalizada`:**

```typescript
type MensagemNormalizada = {
  // ... campos existentes
  kind: TipoMensagemVisual;  // Mudar de "text" | "unsupported"
  dataFormatada?: string;     // NOVO: "13/03/2026 14:30"
  origemAds?: LeadOrigemAds;  // NOVO: dados do ad
};
```

4. **Atualizar função de normalização:**

```typescript
// Dentro de normalizarMensagensEvolution:
const { kind, text } = extrairTextoMensagem(raw.message as Record<string, unknown>, raw.messageType as string);
const dadosAds = extrairDadosAd(raw.contextInfo as EvolutionContextInfo | null);

return {
  // ... campos existentes
  kind: kind,
  text: text,
  dataFormatada: unixTimestampParaDataBr(timestamp),
  origemAds: dadosAds.temAds ? dadosAds : undefined,
};
```

---

### ✏️ Modificar: `src/lib/evolution-api.ts`

**Mudanças:**

1. **Adicionar novos tipos:**

```typescript
// Importar do novo arquivo
export type { 
  EvolutionMessageRecord,
  EvolutionAdReply,
  EvolutionContextInfo 
} from "./whatsapp-utils";
```

2. **Modificar função `buscarMensagens` para retornar registros completos:**

```typescript
// A função atual retorna EvolutionMensagem[] (simplificado)
// Precisamos retornar EvolutionMessageRecord[] para ter acesso a:
// - pushName
// - messageType
// - contextInfo
// - messageTimestamp

// Nova versão:
export async function buscarMensagensCompletas(
  instanceName: string, 
  limitePorPagina: number = 1000
): Promise<EvolutionMessageRecord[]> {
  const todasMensagens: EvolutionMessageRecord[] = [];
  let pagina = 1;
  let temMaisPaginas = true;

  while (temMaisPaginas) {
    const resposta = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        limit: limitePorPagina,
        page: pagina,
      }),
    });

    if (!resposta.ok) break;

    const json = (await resposta.json().catch(() => ({}))) as EvolutionFindMessagesResponse;
    const registros = json.messages?.records ?? [];
    
    if (registros.length === 0) break;

    todasMensagens.push(...registros);

    const totalPaginas = json.messages?.pages ?? 1;
    if (pagina >= totalPaginas) {
      temMaisPaginas = false;
    } else {
      pagina += 1;
    }
  }

  return todasMensagens;
}
```

---

### ✏️ Modificar: `src/lib/leads-sync-whatsapp.ts`

**Mudanças:**

1. **Importar funções do novo arquivo:**

```typescript
import { 
  extrairTelefoneDeRemoteJid,
  extrairDadosAd,
  unixTimestampParaIso,
  formatarTelefoneBr 
} from "@/lib/whatsapp-utils";
import { buscarMensagensCompletas } from "@/lib/evolution-api";
```

2. **Criar função para processar todas as mensagens uma vez:**

```typescript
/**
 * Processa todas as mensagens da instância para extrair:
 * - Primeiro nome válido de cada telefone
 * - Dados do primeiro Ad de cada telefone
 */
async function processarMensagensDaInstancia(instanceName: string): Promise<{
  mapaNomes: Map<string, string>;      // telefone → pushName
  mapaAds: Map<string, LeadOrigemAds>; // telefone → dados do Ad
}> {
  const mapaNomes = new Map<string, string>();
  const mapaAds = new Map<string, LeadOrigemAds>();
  
  const todasMensagens = await buscarMensagensCompletas(instanceName);
  
  for (const msg of todasMensagens) {
    // Ignorar mensagens enviadas pelo CRM
    if (msg.key.fromMe) continue;
    
    // Extrair telefone
    const telefone = extrairTelefoneDeRemoteJid(msg.key.remoteJidAlt);
    if (!telefone) continue;
    
    // Primeiro nome válido (prioridade: fromMe: false)
    if (!mapaNomes.has(telefone) && msg.pushName?.trim()) {
      mapaNomes.set(telefone, msg.pushName.trim());
    }
    
    // Primeiro Ad encontrado
    if (!mapaAds.has(telefone) && msg.contextInfo?.externalAdReply) {
      mapaAds.set(telefone, extrairDadosAd(msg.contextInfo));
    }
  }
  
  return { mapaNomes, mapaAds };
}
```

3. **Modificar `sincronizarEmpresa` para usar os mapas:**

```typescript
// Dentro do loop de instâncias:
const { mapaNomes, mapaAds } = await processarMensagensDaInstancia(instancia.instance_name);

// Dentro do loop de contatos:
const waNumber = normalizado.waNumber;

// Usar o mapa para obter o nome (SEM nova chamada API!)
const nomeOriginal = mapaNomes.get(waNumber);
const dadosAd = mapaAds.get(waNumber);

// Se nãoachou no mapa, usar fallback (telefone)
const nome = nomeOriginal ?? formatarTelefoneBr(waNumber) ?? waNumber;

// Se tem dados do Ad, salvar origem
const origem = dadosAd?.temAds 
  ? `WHATSAPP_ADS_${dadosAd.fonteAds?.toUpperCase() ?? 'UNKNOWN'}` 
  : "SINCRONIZACAO_WHATSAPP";
```

---

### ✏️ Modificar: `src/modules/whatsapp/types.ts`

**Mudanças:**

```typescript
import { 
  TipoMensagemVisual, 
  LeadOrigemAds 
} from "@/lib/whatsapp-utils";

// Atualizar tipo existentes
export type ChatMessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "ERROR" | "DELETED" | "PLAYED";

// Atualizar WhatsappChatMessage
export type WhatsappChatMessage = {
  id: string;
  messageId: string;
  leadId: string;
  remoteJid: string;
  fromMe: boolean;
  direction: "incoming" | "outgoing";
  text: string;
  kind: TipoMensagemVisual;  // Era "text" | "unsupported"
  status: ChatMessageStatus;
  timestamp: number;
  createdAtIso: string;
  readAtIso: string | null;
  optimistic: boolean;
  error: string | null;
  // Novos campos
  dataFormatada?: string;    // "13/03/2026 14:30"
  origemAds?: LeadOrigemAds; // dados do ad
};
```

---

## 🔄 Fluxo Completo de Execução

### Cenário 1: Sincronização de Leads

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário clica em "Sincronizar Leads WhatsApp"           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Para cada instância:                                     │
│    - Chamar buscarMensagensCompletas()                      │
│    - Processar internamente:                                │
│      • Criar mapa de nomes (telefone → pushName)            │
│      • Criar mapa de Ads (telefone → dados do Ad)           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Para cada contato retornado:                            │
│    - Verificar se já existe no banco                       │
│    - Se não existe:                                         │
│      • Buscar nome no mapa (sem chamada API!)               │
│      • Buscar dados do Ad no mapa                           │
│      • Criar lead com dados completos                       │
└─────────────────────────────────────────────────────────────┘
```

### Cenário 2: Abrir Chat no Drawer do Kanban

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário clica no chat de um lead                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Chamar buscarMensagensEvolution()                       │
│    - Payload correto com remoteJidAlt                       │
│    - page: 1, offset: 50                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Receber mensagens                                        │
│    - Tipos já mapejados (texto, áudio, vídeo, etc)         │
│    - Datas formatadas                                       │
│    - Dados do Ad (se houver)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Chamadas API para sync** | N+1 (lento) | 1 por instância (rápido) |
| **Nome do lead** | Errado (do atendente) | Correto (do lead) |
| **Dados do Ad** | Não extraído | Extraído automaticamente |
| **Tipos de mensagem** | Só texto | Texto, áudio, vídeo, etc |
| **Datas** | Unix Timestamp | Formatado "dd/MM/yyyy HH:mm" |
| **Drawer Kanban** | Não carrega | Carrega corretamente |

---

## ⚠️ Pontos de Atenção

1. **Performance:** Buscar todas as mensagens com offset grande pode demorar. Considerar:
   - Limit inicial de 1000 por página
   - Cache em memória durante a sincronização
   - Feedback visual de progresso

2. **Dados Existentes:** Ao atualizar leads existentes:
   - Não sobrescrever nomes que o usuário editou manualmente
   - Preservar dados de origem se já existirem

3. **Novo Banco:** Para dados de Ads, verificar se a tabela `Lead` tem campo de origem. Se não, pode precisar de migration.

4. **Mensagens Antigas:** Se não encontrar Ad na primeira mensagem, pode ser que o Ad esteja em mensagem mais antiga (precisaria buscar mais páginas).

---

## ✅ Checklist de Implementação

- [ ] Criar arquivo `src/lib/whatsapp-utils.ts`
- [ ] Corrigir payload em `src/lib/whatsapp-chat.ts`
- [ ] Adicionar `buscarMensagensCompletas` em `src/lib/evolution-api.ts`
- [ ] Modificar `src/lib/leads-sync-whatsapp.ts` para usar mapas
- [ ] Atualizar tipos em `src/modules/whatsapp/types.ts`
- [ ] Testar sincronização de leads
- [ ] Testar abertura do drawer do Kanban
- [ ] Verificar se dados do Ad estão sendo salvos

---

## 📝 Notas

- Este documento deve ser atualizado conforme a implementação progride
- Todas as mudanças seguem o padrão MVVM descrito em AGENTS.md
- Utilitários devem ser reutilizáveis em todo o codebase
- Manter compatibilidade com código existente (não quebrar funcionalidades)

---

*Documento criado em: 13/03/2026*
*Projeto: CRM Consórcio - Evolution API 2.3+*
