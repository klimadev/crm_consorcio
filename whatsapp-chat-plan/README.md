# WhatsApp Chat CRM - Plano de Implementação

## Visão Geral

Adicionar chat WhatsApp diretamente no Lead Details Drawer do Kanban, utilizando a Evolution API já configurada na VPS. O chat será acessível apenas para leads registrados no sistema.

---

## 1. Arquitetura do Sistema

### 1.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Lead Details Drawer (Tab: Chat WhatsApp)                   │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │  WhatsAppChat Component                              │    │  │
│  │  │  - Header (nome + status conexão)                   │    │  │
│  │  │  - MessageList (bolhas mensagens)                   │    │  │
│  │  │  - MessageInput (input + enviar)                    │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                     │
│                              ▼ (polling 5s)                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  API Routes                                                │  │
│  │  - GET  /api/whatsapp/chat/messages?leadId=              │  │
│  │  - POST /api/whatsapp/chat/send-message                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Evolution API (VPS)                         │
│  URL: http://177.153.38.26:8080                                    │
│  API Key: 429683C4C977415CAAFCCE10F7D57E11                       │
│                                                                     │
│  Endpoints utilizados:                                             │
│  - POST /chat/findMessages/{instance}  → Buscar histórico          │
│  - POST /message/sendText/{instance}  → Enviar mensagem           │
│  - GET  /instance/connectionState/{instance} → Status conexão    │
│  - POST /chat/findChats/{instance}    → Listar chats (futuro)    │
│  - POST /chat/markMessageAsRead/{instance} → Marcar como lido    │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FLUXO: Receber Mensagens                       │
└──────────────────────────────────────────────────────────────────────┘

1. Frontend (useEffect + setInterval 5s)
       │
       │ GET /api/whatsapp/chat/messages?leadId=xxx
       ▼
2. Backend API Route
       │
       │ 2.1. Busca instância ativa da empresa
       │ 2.2. Normaliza telefone do lead para JID
       │ 2.3. POST /chat/findMessages/{instance}
       │      { where: { key: { remoteJid: "55..." } }, limit: 50 }
       │ 2.4. Filtra mensagens do contato
       ▼
3. Evolution API → WhatsApp
       │
       │ Retorna array de mensagens com:
       │ - key.id, key.remoteJid, key.fromMe
       │ - message.conversation (ou extendedTextMessage)
       │ - messageTimestamp (Unix)
       │ - status (se disponível)
       ▼
4. Backend → Frontend
       │
       │ Retorna mensagens formatadas:
       │ { mensagens: [...], instanceStatus: "connected" }
       ▼
5. Frontend atualiza UI

┌──────────────────────────────────────────────────────────────────────┐
│                      FLUXO: Enviar Mensagem                         │
└──────────────────────────────────────────────────────────────────────┘

1. Usuário digita mensagem e clica enviar
       │
       │ POST /api/whatsapp/chat/send-message
       │ { leadId, mensagem }
       ▼
2. Backend API Route
       │
       │ 2.1. Busca lead + valida acesso (RBAC)
       │ 2.2. Busca instância ativa da empresa
       │ 2.3. Normaliza telefone para formato WhatsApp
       │ 2.4. POST /message/sendText/{instance}
       │      { number: "55...", text: "Olá!" }
       ▼
3. Evolution API → WhatsApp
       │
       │ Retorna:
       │ { key: { id, remoteJid, fromMe }, status: "PENDING" }
       ▼
4. Backend → Frontend
       │
       │ Retorna: { sucesso: true, mensagemId: "..." }
       ▼
5. Frontend atualiza lista (optimistic UI)
```

---

## 2. Modelo de Dados

### 2.1 Prisma Schema (Adições)

```prisma
// NOVO: Armazenar mensagens localmente para cache e rápida recuperação
model WhatsAppMensagem {
  id              String   @id @default(cuid())
  id_lead         String   // FK para Lead
  id_instancia    String   // FK para WhatsAppInstancia
  
  // Dados da mensagem
  remote_jid      String   // 5511999999999@s.whatsapp.net
  mensagem_id     String   // ID da msg no WhatsApp (key.id)
  tipo            String   // text, image, audio, video, sticker, etc
  conteudo        String?  // Texto da mensagem
  
  // Metadados
  direcao         String   // incoming | outgoing
  status          String   // pending | sent | delivered | read | error
  timestamp       Int      // Unix timestamp
  
  created_at      DateTime @default(now())

  @@index([id_lead])
  @@index([remote_jid])
  @@index([timestamp])
}
```

### 2.2 Campos Relevantes do Lead

```prisma
model Lead {
  id          String @id @default(uuid())
  nome        String
  telefone    String  // Formato: "(11) 99999-8888" (com máscara)
  // ... outros campos
}
```

---

## 3. APIs da Evolution API

### 3.1 Buscar Mensagens (GET history)

**Endpoint:** `POST /chat/findMessages/{instance}`

**Request:**
```json
{
  "where": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net"
    }
  },
  "limit": 50
}
```

**Response (campos relevantes):**
```json
[
  {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5F2A1B2C3D4E5"
    },
    "message": {
      "conversation": "Olá, quero mais informações!"
    },
    "messageType": "conversation",
    "messageTimestamp": 1699999999
  },
  {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net", 
      "fromMe": true,
      "id": "BAE5F2A1B2C3D4E6"
    },
    "message": {
      "extendedTextMessage": {
        "text": "Claro! Em que posso ajudar?"
      }
    },
    "messageType": "extendedTextMessage",
    "messageTimestamp": 1700000000
  }
]
```

### 3.2 Enviar Mensagem (Send)

**Endpoint:** `POST /message/sendText/{instance}`

**Request:**
```json
{
  "number": "5511999999999",
  "text": "Olá! Como posso ajudar?"
}
```

**Response:**
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

**Status possíveis:**
- `PENDING` - Mensagem enviada, aguardando servidor
- `sent` - Enviada ao destinatário
- `delivered` - Entregue ao destinatário
- `read` - Lida pelo destinatário

### 3.3 Status da Conexão

**Endpoint:** `GET /instance/connectionState/{instance}`

**Response:**
```json
{
  "instance": {
    "instanceName": "crm_xxx",
    "state": "open"  // "open" = conectado, "close" = desconectado
  }
}
```

### 3.4 Marcar Mensagens como Lidas

**Endpoint:** `POST /chat/markMessageAsRead/{instance}`

**Request:**
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

---

## 4. RBAC e Permissões

### 4.1 Lógica de Acesso

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PERFIL: COLABORADOR                          │
├─────────────────────────────────────────────────────────────────────┤
│ • Acessa apenas leads atribuídos a ele                             │
│ • Se tentar acessar lead de outro → 404                            │
│ • Chat só abre se tiver acesso ao lead                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PERFIL: GERENTE                              │
├─────────────────────────────────────────────────────────────────────┤
│ • Acessa todos os leads do seu PDV                                 │
│ • Pode ver chats de todos os colaboradores do PDV                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PERFIL: EMPRESA (Dono)                       │
├─────────────────────────────────────────────────────────────────────┤
│ • Acessa TODOS os leads da empresa                                 │
│ • Acessa TODOS os chats                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementação ( reuse whereLeadsPorPerfil)

```typescript
// src/lib/permissoes.ts - já existe
export async function whereLeadsPorPerfil(sessao: SessaoToken) {
  // COLABORADOR: only sees leads where they are the responsible
  if (sessao.perfil === "COLABORADOR") {
    return {
      id_empresa: sessao.id_empresa,
      id_funcionario: sessao.id_usuario,
    };
  }

  // GERENTE: sees leads from their PDV only
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    const funcionariosDoPdv = await prisma.funcionario.findMany({
      where: { id_pdv: sessao.id_pdv },
      select: { id: true },
    });
    const idsFuncionarios = funcionariosDoPdv.map((f) => f.id);

    return {
      id_empresa: sessao.id_empresa,
      id_funcionario: { in: idsFuncionarios },
    };
  }

  // EMPRESA: sees all company leads
  return { id_empresa: sessao.id_empresa };
}
```

---

## 5. UI/UX do Chat

### 5.1 Localização

O chat será integrado como uma **tab** dentro do Lead Details Drawer existente:

```
┌─────────────────────────────────────────────────────────────────────┐
│ DRAWER: João Silva                                         [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ [ DETALHES ]  [ CHAT WHATSAPP ]                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ☑ WhatsApp    ● Online                         🕐 10:30│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │  ┌────────────────────────────────────────────────────┐   │    │
│  │  │ Oi, quero saber mais sobre o consorcio de carros   │   │    │
│  │  │                                                10:30│   │    │
│  │  └────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │                    ┌────────────────────────────────┐       │    │
│  │                    │ Claro! Posso ajudar com isso │       │    │
│  │                    │                          10:31│       │    │
│  │                    │                          ✓✓    │       │    │
│  │                    └────────────────────────────────┘       │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  📎  │  Digite uma mensagem...                     │  ➤  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Componentes a Criar

```
src/modules/whatsapp/components/
├── chat/
│   ├── whatsapp-chat.tsx              # Container principal (h-full)
│   ├── whatsapp-chat-header.tsx        # Header + status conexão
│   ├── whatsapp-message-list.tsx       # Lista scrollável de mensagens
│   ├── whatsapp-message-bubble.tsx     # Bolha de mensagem individual
│   ├── whatsapp-message-input.tsx      # Input + botão enviar
│   └── whatsapp-chat-status.tsx        # Badge de status conexão
```

### 5.3 Design Visual

#### Cores (Tailwind)
| Elemento | Cor | Classe |
|----------|-----|--------|
| Header | Verde WhatsApp | `bg-emerald-600` |
| Bolha enviada | Verde claro | `bg-emerald-100` |
| Bolha recebida | Branco | `bg-white` |
| Input background | Cinza claro | `bg-slate-100` |
| Texto mensagem | Slate 800 | `text-slate-800` |
| Timestamp | Slate 500 | `text-slate-500` |
| Check enviado | Cinza | `text-slate-400` |
| Check lido | Azul | `text-blue-500` |
| Status offline | Vermelho | `text-red-500` |
| Status online | Verde | `text-emerald-500` |

#### Tipografia
- Nome contato: `font-semibold text-sm`
- Timestamp: `text-xs`
- Mensagem: `text-sm`
- Input: `text-sm`

#### Espaçamento
- Padding container: `p-3`
- Gap entre bolhas: `space-y-2`
- Padding bolha: `px-3 py-2`
- Border radius bolha: `rounded-2xl`
- Border radius input: `rounded-full`

#### Animações
- Nova mensagem: `animate-slide-up` (200ms)
- Scroll: `scroll-smooth`
- Hover input: `focus:ring-2 focus:ring-emerald-500`
- Botão enviar hover: `hover:scale-105 active:scale-95`

### 5.4 Estados da UI

| Estado | Visual |
|--------|--------|
| **Carregando** | Skeleton com shimmer (3 itens) |
| **Vazio** | Ícone + "Nenhuma mensagem ainda" |
| **Erro conexão** | Banner vermelho "WhatsApp desconectado" |
| **Enviando** | Optimistic add + spinner no botão |
| **Erro envio** | Mensagem com borda vermelha + retry |

---

## 6. Estrutura de Arquivos

### 6.1 Arquivos a Criar/Modificar

```
C:\Users\darci\desenvolvimento\crm_consorcio\
│
├── .env                                    # Adicionar EVOLUTION_API_URL/KEY
│
├── prisma/
│   └── schema.prisma                       # Adicionar WhatsAppMensagem
│
├── src/
│   ├── app/api/whatsapp/chat/
│   │   ├── messages/
│   │   │   └── route.ts                    # GET mensagens do lead
│   │   └── send-message/
│   │       └── route.ts                    # POST enviar mensagem
│   │
│   ├── modules/whatsapp/
│   │   ├── components/chat/
│   │   │   ├── whatsapp-chat.tsx
│   │   │   ├── whatsapp-chat-header.tsx
│   │   │   ├── whatsapp-message-list.tsx
│   │   │   ├── whatsapp-message-bubble.tsx
│   │   │   ├── whatsapp-message-input.tsx
│   │   │   └── whatsapp-chat-status.tsx
│   │   │
│   │   ├── hooks/
│   │   │   └── use-whatsapp-chat.ts         # Hook principal do chat
│   │   │
│   │   └── lib/
│   │       └── evolution-client.ts          # Cliente API (opcional)
│   │
│   └── modules/kanban/
│       └── components/
│           └── lead-details-drawer.tsx      # INTEGRAÇÃO: Adicionar tabs + chat
│
```

### 6.2 Detalhamento

#### `src/app/api/whatsapp/chat/messages/route.ts`

```typescript
// GET /api/whatsapp/chat/messages?leadId=xxx
// Retorna mensagens do lead via polling na Evolution API

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json({ erro: "leadId obrigatório" }, { status: 400 });
  }

  // 1. Busca lead com validação RBAC
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...(await whereLeadsPorPerfil(auth.sessao)),
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  // 2. Busca instância ativa da empresa
  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      id_empresa: auth.sessao.id_empresa,
      status: "open", // conectado
    },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Nenhuma instância conectada" }, { status: 400 });
  }

  // 3. Normaliza telefone para JID WhatsApp
  const telefoneNormalizado = normalizarTelefoneParaWhatsapp(lead.telefone);
  if (!telefoneNormalizado.valido) {
    return NextResponse.json({ erro: "Telefone inválido" }, { status: 400 });
  }

  // 4. Busca mensagens na Evolution API
  const remoteJid = `${telefoneNormalizado.waNumber}@s.whatsapp.net`;
  
  const resposta = await fetch(
    `${EVOLUTION_API_URL}/chat/findMessages/${instancia.instance_name}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({
        where: { key: { remoteJid } },
        limit: 50,
      }),
    }
  );

  if (!resposta.ok) {
    return NextResponse.json({ erro: "Erro ao buscar mensagens" }, { status: 500 });
  }

  const mensagensRaw = await resposta.json();

  // 5. Formata mensagens
  const mensagens = formatarMensagens(mensagensRaw, remoteJid);

  // 6. Retorna
  return NextResponse.json({
    mensagens,
    instanceStatus: instancia.status,
    lead: {
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
    },
  });
}
```

#### `src/app/api/whatsapp/chat/send-message/route.ts`

```typescript
// POST /api/whatsapp/chat/send-message
// { leadId, mensagem }

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const body = await request.json();
  const { leadId, mensagem } = body;

  if (!leadId || !mensagem?.trim()) {
    return NextResponse.json({ erro: "leadId e mensagem obrigatórios" }, { status: 400 });
  }

  // 1. Busca lead com validação RBAC
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...(await whereLeadsPorPerfil(auth.sessao)),
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  // 2. Busca instância ativa
  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      id_empresa: auth.sessao.id_empresa,
      status: "open",
    },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "WhatsApp desconectado" }, { status: 400 });
  }

  // 3. Normaliza telefone e envia
  const telefoneNormalizado = normalizarTelefoneParaWhatsapp(lead.telefone);
  if (!telefoneNormalizado.valido || !telefoneNormalizado.waNumber) {
    return NextResponse.json({ erro: "Telefone inválido para WhatsApp" }, { status: 400 });
  }

  try {
    const resposta = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instancia.instance_name}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({
          number: telefoneNormalizado.waNumber,
          text: mensagem,
        }),
      }
    );

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.message || "Erro ao enviar");
    }

    const resultado = await resposta.json();

    return NextResponse.json({
      sucesso: true,
      mensagemId: resultado.key?.id,
      status: resultado.status,
    });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
```

#### `src/modules/whatsapp/hooks/use-whatsapp-chat.ts`

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useWhatsappChat(leadId: string | null) {
  const [mensagens, setMensagens] = useState<WhatsappMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string>("unknown");
  
  const pollingRef = useRef<NodeJS.Timeout>();
  const ultimoTimestampRef = useRef<number>(0);

  // Função para buscar mensagens
  const fetchMensagens = useCallback(async () => {
    if (!leadId) return;

    try {
      const params = new URLSearchParams({ leadId });
      const resposta = await fetch(`/api/whatsapp/chat/messages?${params}`);

      if (!resposta.ok) {
        const json = await resposta.json().catch(() => ({}));
        setErro(json.erro || "Erro ao carregar");
        return;
      }

      const json = await resposta.json();
      
      // Atualiza só se tiver mensagens novas (por timestamp)
      if (json.mensagens?.length > 0) {
        const maisRecente = Math.max(...json.mensagens.map((m: any) => m.timestamp));
        
        if (maisRecente > ultimoTimestampRef.current) {
          setMensagens(json.mensagens);
          ultimoTimestampRef.current = maisRecente;
        }
      }
      
      setInstanceStatus(json.instanceStatus || "unknown");
      setErro(null);
    } catch {
      setErro("Erro de conexão");
    } finally {
      setCarregando(false);
    }
  }, [leadId]);

  // Carrega inicial + polling
  useEffect(() => {
    if (!leadId) {
      setMensagens([]);
      return;
    }

    setCarregando(true);
    ultimoTimestampRef.current = 0;
    void fetchMensagens();

    // Polling a cada 5 segundos
    pollingRef.current = setInterval(() => {
      void fetchMensagens();
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [leadId, fetchMensagens]);

  // Função para enviar mensagem
  const enviarMensagem = useCallback(async (texto: string) => {
    if (!leadId || !texto.trim()) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const mensagemTemp: WhatsappMessage = {
      id: tempId,
      conteudo: texto,
      direcao: "outgoing",
      status: "pending",
      timestamp: Math.floor(Date.now() / 1000),
    };

    setMensagens((antigas) => [...antigas, mensagemTemp]);
    setEnviando(true);

    try {
      const resposta = await fetch("/api/whatsapp/chat/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, mensagem: texto }),
      });

      if (!resposta.ok) {
        // Rollback
        setMensagens((antigas) => antigas.filter((m) => m.id !== tempId));
        const json = await resposta.json().catch(() => ({}));
        throw new Error(json.erro || "Erro ao enviar");
      }

      const json = await resposta.json();

      // Atualiza com dados reais
      setMensagens((antigas) =>
        antigas.map((m) =>
          m.id === tempId
            ? { ...m, id: json.mensagemId || tempId, status: json.status || "sent" }
            : m
        )
      );
    } catch (erro) {
      setMensagens((antigas) => antigas.filter((m) => m.id !== tempId));
      setErro(erro instanceof Error ? erro.message : "Erro ao enviar");
    } finally {
      setEnviando(false);
    }
  }, [leadId]);

  return {
    mensagens,
    carregando,
    enviando,
    erro,
    instanceStatus,
    enviarMensagem,
    recarregar: fetchMensagens,
  };
}
```

---

## 7. Integração com Lead Details Drawer

### 7.1 Estrutura Atual (manter)

O drawer atual já tem:
- Header com nome do lead
- Campos: telefone, valor, observações
- Upload de documento
- Pendências
- Botão WhatsApp (wa.me)

### 7.2 Modificações

Adicionar tabs:

```tsx
// pseudo-código da integração
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WhatsAppChat } from "@/modules/whatsapp/components/chat/whatsapp-chat";

// Dentro do drawer, substituir conteúdo por:
<Tabs defaultValue="detalhes">
  <TabsList className="w-full">
    <TabsTrigger value="detalhes" className="flex-1">Detalhes</TabsTrigger>
    <TabsTrigger value="chat" className="flex-1">
      Chat
      {temMensagensNaoLidas && (
        <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="detalhes">
    {/* Conteúdo atual do drawer */}
  </TabsContent>
  
  <TabsContent value="chat">
    {leadSelecionado && (
      <WhatsAppChat 
        leadId={leadSelecionado.id}
        leadNome={leadSelecionado.nome}
        className="h-[calc(100vh-300px)]"
      />
    )}
  </TabsContent>
</Tabs>
```

---

## 8. Tratamento de Casos Especiais

### 8.1 Instância Desconectada

- Mostrar banner vermelho "WhatsApp desconectado"
- Desabilitar input de mensagem
- Exibir botão "Reconectar" (redireciona para página WhatsApp)

### 8.2 Telefone Inválido

- Mostrar erro no chat "Telefone inválido para WhatsApp"
- Não tentar enviar

### 8.3 Erro ao Enviar

- Bolha com borda vermelha
- Ícone de retry (botão)
- Tooltip com erro

### 8.4 Conversa Vazia

- Mostrar illustration + texto "Nenhuma mensagem ainda"
- Input disponível para iniciar conversa

---

## 9. Polling Strategy

### 9.1 Configuração

| Cenário | Intervalo |
|---------|-----------|
| Chat aberto | 5 segundos |
| Chat fechado | não polling |
| Tab inativa | pausar polling |

### 9.2 Otimizações

- Cache local com último timestamp
- Só atualizar se mensagens novas
- Debounce no input (opcional)

---

## 10. Testes

### 10.1 Testes Unitários

```typescript
// src/modules/whatsapp/hooks/__tests__/use-whatsapp-chat.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useWhatsappChat", () => {
  it("deve carregar mensagens ao iniciar com leadId", async () => {
    // Arrange
    const leadId = "lead-123";
    
    // Act
    // Render hook com leadId
    
    // Assert
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/whatsapp/chat/messages?leadId=${leadId}`)
    );
  });

  it("deve fazer polling a cada 5 segundos", async () => {
    // Arrange
    vi.useFakeTimers();
    
    // Act
    // Render hook
    
    // Avançar 5 segundos
    vi.advanceTimersByTime(5000);
    
    // Assert
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("deve fazer optimistic update ao enviar", async () => {
    // Arrange
    const { result } = renderHook(() => useWhatsappChat("lead-123"));
    
    // Act
    await actAsync(() => result.current.enviarMensagem("Olá"));
    
    // Assert
    expect(result.current.mensagens).toHaveLength(1);
    expect(result.current.mensagens[0].conteudo).toBe("Olá");
    expect(result.current.mensagens[0].direcao).toBe("outgoing");
  });
});
```

---

## 11. Variáveis de Ambiente

### .env (adicionar)

```env
# Evolution API (VPS)
EVOLUTION_API_URL=http://177.153.38.26:8080
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11

# Opcional: Token interno para automações
INTERNAL_AUTOMATION_TOKEN=5802d0f17bb8a07691ca1cf3c3b92fb1baa7d2c61e21e371
```

---

## 12. Validação e Verificação

### 12.1 Pipeline de Validação

Após cada fase de implementação:

```bash
# 1. Lint (rápido)
npm run lint

# 2. Build (verifica types)
npm run build

# 3. Testes (se implementados)
npm run test
```

### 12.2 Checklist Funcional

- [ ] Lead Details Drawer abre com nova tab Chat
- [ ] Mensagens carregam ao abrir chat
- [ ] Polling busca novas mensagens a cada 5s
- [ ] Enviar mensagem funciona
- [ ] Optimistic update exibe mensagem imediatamente
- [ ] Erro mostra na UI com retry
- [ ] Banner desconectado quando instância offline
- [ ] RBAC: colaborador só vê seus leads
- [ ] RBAC: gerente vê leads do PDV
- [ ] RBAC: empresa vê todos leads

---

## 13. Próximos Passos (Futuro)

### Fase 2 (fora do escopo MVP)

- [ ] Suporte a mídias (imagem, áudio, documento)
- [ ] Notificações Push
- [ ] Chat real-time (WebSocket em vez de polling)
- [ ] Múltiplas instâncias por empresa
- [ ] Chat com leads não-cadastrados
- [ ] Histórico persistente (salvar no DB)

---

## 14. Fontes e Referências

### Documentação Evolution API
- https://docs.evoapicloud.com/api-reference/chat-controller/find-messages.md
- https://docs.evoapicloud.com/api-reference/message-controller/send-text.md
- https://docs.evoapicloud.com/api-reference/instance-controller/connection-state.md
- https://docs.evoapicloud.com/api-reference/chat-controller/mark-as-read.md

### Padrões do Projeto
- API Routes: `src/app/api/whatsapp/instances/route.ts`
- Hooks: `src/modules/whatsapp/hooks/use-whatsapp-module.ts`
- Tipos: `src/modules/whatsapp/types.ts`
- RBAC: `src/lib/permissoes.ts`
- Normalização telefone: `src/lib/phone.ts`

---

## 15. Resumo de APIs Evolution Utilizadas

| Endpoint | Método | Uso no MVP |
|----------|--------|------------|
| `/chat/findMessages/{instance}` | POST | Buscar histórico de mensagens |
| `/message/sendText/{instance}` | POST | Enviar mensagem de texto |
| `/instance/connectionState/{instance}` | GET | Verificar status conexão |
| `/chat/markMessageAsRead/{instance}` | POST | Marcar como lido (futuro) |
| `/chat/findChats/{instance}` | POST | Listar conversas (futuro) |

---

*Documento gerado para planejamento - Versão 1.0*
*Data: 2026-02-28*
