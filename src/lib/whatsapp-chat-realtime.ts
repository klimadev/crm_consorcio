import { prisma } from "@/lib/prisma";
import { formatarPreviewMensagem } from "@/lib/whatsapp-utils";
import { whereLeadsPorPerfil } from "@/lib/permissoes";
import {
  buscarConnectionStatus,
  buscarLeadComAcesso,
  buscarMensagensEvolution,
  buscarPdvDoLead,
  mapearMensagemDbParaCanonica,
  normalizarMensagensEvolution,
  normalizarRemoteJidParaLead,
  resolverInstanciaDoLead,
  upsertMensagensNoBanco,
} from "@/lib/whatsapp-chat";
import type { SessaoToken } from "@/lib/tipos";
import type { ChatConnectionStatus, WhatsappChatMessage } from "@/modules/whatsapp/types";
import type { ConversaResumo, ConversasResponse } from "@/modules/chat/types";
import { Prisma } from "@prisma/client";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15000;
const DEFAULT_MESSAGES_POLL_MS = 10000;
const DEFAULT_CONVERSATIONS_POLL_MS = 10000;
const CHAT_SYNC_TTL_MS = 8000;

type MensagensSnapshot = {
  messages: WhatsappChatMessage[];
  connectionStatus: ChatConnectionStatus;
  unreadCount: number;
};

type ChatStreamParams = {
  tipo: "chat";
  chave: string;
  pollMs?: number;
  carregarSnapshot: () => Promise<MensagensSnapshot>;
};

type ConversationsStreamParams = {
  tipo: "conversations";
  chave: string;
  pollMs?: number;
  carregarSnapshot: () => Promise<ConversasResponse>;
};

type StreamChannelParams = ChatStreamParams | ConversationsStreamParams;

type StreamEventPayload = {
  connectedAt?: string;
  erro?: string;
  unreadCount?: number;
  connectionStatus?: ChatConnectionStatus;
  messages?: WhatsappChatMessage[];
  conversas?: ConversaResumo[];
  cursor?: string | null;
  temMais?: boolean;
  ts?: string;
};

type StreamEvent = {
  event: string;
  data: StreamEventPayload;
};

type Subscriber = {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};

type StreamChannel = {
  tipo: StreamChannelParams["tipo"];
  chave: string;
  pollMs: number;
  subscribers: Map<string, Subscriber>;
  heartbeat: ReturnType<typeof setInterval> | null;
  polling: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
  carregarSnapshot: () => Promise<MensagensSnapshot | ConversasResponse>;
  ultimoHash: string | null;
};

type ChatSnapshotCache = {
  promise: Promise<MensagensSnapshot> | null;
  snapshot: MensagensSnapshot | null;
  expiresAt: number;
};

type GlobalRealtimeState = {
  channels: Map<string, StreamChannel>;
  chatCache: Map<string, ChatSnapshotCache>;
};

declare global {
   
  var __whatsappChatRealtimeState: GlobalRealtimeState | undefined;
}

function obterEstadoGlobal(): GlobalRealtimeState {
  if (!globalThis.__whatsappChatRealtimeState) {
    globalThis.__whatsappChatRealtimeState = {
      channels: new Map(),
      chatCache: new Map(),
    };
  }

  return globalThis.__whatsappChatRealtimeState;
}

function serializarEvento(event: string, data: StreamEventPayload) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function publicar(channel: StreamChannel, event: string, data: StreamEventPayload) {
  for (const [subscriberId, subscriber] of channel.subscribers.entries()) {
    try {
      subscriber.controller.enqueue(serializarEvento(event, data));
    } catch {
      channel.subscribers.delete(subscriberId);
    }
  }
}

function limparCanal(chave: string) {
  const estado = obterEstadoGlobal();
  const channel = estado.channels.get(chave);
  if (!channel) return;

  if (channel.heartbeat) clearInterval(channel.heartbeat);
  if (channel.polling) clearTimeout(channel.polling);
  estado.channels.delete(chave);
}

function agendarPolling(channel: StreamChannel) {
  if (channel.polling) clearTimeout(channel.polling);
  if (channel.subscribers.size === 0) {
    limparCanal(channel.chave);
    return;
  }

  channel.polling = setTimeout(() => {
    void executarPolling(channel);
  }, channel.pollMs);
}

async function executarPolling(channel: StreamChannel) {
  if (channel.inFlight || channel.subscribers.size === 0) {
    agendarPolling(channel);
    return;
  }

  const tarefa = (async () => {
    try {
      const snapshot = await channel.carregarSnapshot();
      const hash = JSON.stringify(snapshot);

      if (hash !== channel.ultimoHash) {
        channel.ultimoHash = hash;
        if (channel.tipo === "chat") {
          const dados = snapshot as MensagensSnapshot;
          publicar(channel, "snapshot", {
            messages: dados.messages,
            unreadCount: dados.unreadCount,
            connectionStatus: dados.connectionStatus,
          });
        } else {
          const dados = snapshot as ConversasResponse;
          publicar(channel, "snapshot", {
            conversas: dados.conversas,
            cursor: dados.cursor,
            temMais: dados.temMais,
          });
        }
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro ao sincronizar stream.";
      publicar(channel, "error", { ts: new Date().toISOString(), erro: mensagem });
    } finally {
      channel.inFlight = null;
      agendarPolling(channel);
    }
  })();

  channel.inFlight = tarefa;
  await tarefa;
}

function criarCanal(params: StreamChannelParams): StreamChannel {
  const channel: StreamChannel = {
    tipo: params.tipo,
    chave: params.chave,
    pollMs: params.pollMs ?? (params.tipo === "chat" ? DEFAULT_MESSAGES_POLL_MS : DEFAULT_CONVERSATIONS_POLL_MS),
    subscribers: new Map(),
    heartbeat: null,
    polling: null,
    inFlight: null,
    carregarSnapshot: params.carregarSnapshot,
    ultimoHash: null,
  };

  channel.heartbeat = setInterval(() => {
    if (channel.subscribers.size === 0) {
      limparCanal(channel.chave);
      return;
    }

    publicar(channel, "heartbeat", { ts: new Date().toISOString() });
  }, HEARTBEAT_MS);

  return channel;
}

export function criarRespostaSse(params: StreamChannelParams, request: Request) {
  const estado = obterEstadoGlobal();
  const channel = estado.channels.get(params.chave) ?? criarCanal(params);
  estado.channels.set(params.chave, channel);

  const subscriberId = `${params.chave}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      channel.subscribers.set(subscriberId, { id: subscriberId, controller });
      controller.enqueue(serializarEvento("connected", { connectedAt: new Date().toISOString() }));
      void executarPolling(channel);

      request.signal.addEventListener("abort", () => {
        channel.subscribers.delete(subscriberId);
        if (channel.subscribers.size === 0) {
          limparCanal(channel.chave);
        }
      }, { once: true });
    },
    cancel() {
      channel.subscribers.delete(subscriberId);
      if (channel.subscribers.size === 0) {
        limparCanal(channel.chave);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function obterSnapshotMensagens(sessao: SessaoToken, leadId: string): Promise<MensagensSnapshot> {
  const lead = await buscarLeadComAcesso(sessao, leadId);
  if (!lead) {
    throw new Error("Lead nao encontrado.");
  }

  const instancia = await resolverInstanciaDoLead(sessao.id_empresa, lead.id);
  if (!instancia) {
    const leadComPdv = await buscarPdvDoLead(sessao.id_empresa, lead.id);
    const pdv = leadComPdv?.funcionario?.pdv;
    const podeConfigurar = sessao.perfil === "EMPRESA" || (sessao.perfil === "GERENTE" && sessao.id_pdv === pdv?.id);
    const erro = new Error("Lead sem instancia WhatsApp configurada no PDV.");
    (erro as Error & { codigo?: string; pdv?: { id: string; nome: string } | null; rotaConfiguracao?: string | null }).codigo = "PDV_SEM_INSTANCIA";
    (erro as Error & { pdv?: { id: string; nome: string } | null }).pdv = pdv ? { id: pdv.id, nome: pdv.nome } : null;
    (erro as Error & { rotaConfiguracao?: string | null }).rotaConfiguracao = podeConfigurar && pdv ? `/equipe?id_pdv=${pdv.id}&editar_pdv=${pdv.id}` : null;
    throw erro;
  }

  const remoteJidInfo = normalizarRemoteJidParaLead(lead.telefone);
  if (!remoteJidInfo.ok) {
    throw new Error(remoteJidInfo.erro);
  }

  const cacheKey = `${sessao.id_empresa}:${instancia.id}:${lead.id}`;
  const estado = obterEstadoGlobal();
  const agora = Date.now();
  const cache = estado.chatCache.get(cacheKey);

  if (cache?.promise) {
    return cache.promise;
  }

  if (cache?.snapshot && cache.expiresAt > agora) {
    return cache.snapshot;
  }

  const promise = (async () => {
    const [mensagensCache, unreadCount] = await Promise.all([
      prisma.whatsappMensagem.findMany({
        where: { id_empresa: sessao.id_empresa, id_lead: lead.id },
        orderBy: { timestamp: "asc" },
      }),
      prisma.whatsappMensagem.count({
        where: {
          id_empresa: sessao.id_empresa,
          id_lead: lead.id,
          from_me: false,
          lida_no_crm_em: null,
        },
      }),
    ]);

    let connectionStatus: ChatConnectionStatus = "offline";

    try {
      connectionStatus = await buscarConnectionStatus(instancia.instanceName, instancia.id);
      const payload = await buscarMensagensEvolution(instancia.instanceName, remoteJidInfo.remoteJid);
      const targetNumber = remoteJidInfo.waNumber.replace(/\D/g, "");

      const mensagensNormalizadas = normalizarMensagensEvolution(payload).filter((mensagem) => {
        const jidComparacao = mensagem.remoteJidAlt ?? mensagem.remoteJid;
        const msgNumber = jidComparacao.replace(/\D/g, "");
        return msgNumber.includes(targetNumber) || targetNumber.includes(msgNumber);
      });

      if (mensagensNormalizadas.length > 0) {
        await upsertMensagensNoBanco(prisma, {
          idEmpresa: sessao.id_empresa,
          idLead: lead.id,
          idWhatsappInstancia: instancia.id,
          mensagens: mensagensNormalizadas,
        });
      }
    } catch (error) {
      console.error("[chat-realtime] Erro ao sincronizar mensagens:", error);
      connectionStatus = "offline";
    }

    const [mensagensAtualizadas, unreadAtualizado] = await Promise.all([
      prisma.whatsappMensagem.findMany({
        where: { id_empresa: sessao.id_empresa, id_lead: lead.id },
        orderBy: { timestamp: "asc" },
      }),
      prisma.whatsappMensagem.count({
        where: {
          id_empresa: sessao.id_empresa,
          id_lead: lead.id,
          from_me: false,
          lida_no_crm_em: null,
        },
      }),
    ]);

    const snapshot: MensagensSnapshot = {
      messages: (mensagensAtualizadas.length > 0 ? mensagensAtualizadas : mensagensCache).map(mapearMensagemDbParaCanonica),
      connectionStatus,
      unreadCount: mensagensAtualizadas.length > 0 ? unreadAtualizado : unreadCount,
    };

    estado.chatCache.set(cacheKey, {
      promise: null,
      snapshot,
      expiresAt: Date.now() + CHAT_SYNC_TTL_MS,
    });

    return snapshot;
  })();

  estado.chatCache.set(cacheKey, {
    promise,
    snapshot: cache?.snapshot ?? null,
    expiresAt: agora + CHAT_SYNC_TTL_MS,
  });

  try {
    return await promise;
  } catch (error) {
    estado.chatCache.delete(cacheKey);
    throw error;
  } finally {
    const atualizado = estado.chatCache.get(cacheKey);
    if (atualizado?.promise === promise) {
      estado.chatCache.set(cacheKey, {
        promise: null,
        snapshot: atualizado.snapshot,
        expiresAt: atualizado.expiresAt,
      });
    }
  }
}

export async function obterSnapshotConversas(
  sessao: SessaoToken,
  params: { busca?: string; cursor?: string | null; limite?: number; naoLidas?: boolean },
): Promise<ConversasResponse> {
  const busca = params.busca?.trim() ?? "";
  const cursor = params.cursor?.trim() ?? null;
  const limite = Math.min(params.limite ?? 30, 50);
  const apenasNaoLidas = params.naoLidas === true;

  // Construir condição SQL baseada no perfil do usuário
  let condicaoPerfil: Prisma.Sql;
  if (sessao.perfil === "COLABORADOR") {
    // Apenas leads onde o colaborador é responsável
    condicaoPerfil = Prisma.sql`AND l.id_funcionario = ${sessao.id_usuario}`;
  } else if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    // Apenas leads de funcionários do PDV do gerente
    const funcionariosDoPdv = await prisma.funcionario.findMany({
      where: { id_pdv: sessao.id_pdv },
      select: { id: true },
    });
    const idsFuncionarios = funcionariosDoPdv.map((f) => f.id);
    if (idsFuncionarios.length > 0) {
      condicaoPerfil = Prisma.sql`AND l.id_funcionario IN (${Prisma.join(idsFuncionarios)})`;
    } else {
      // Se não há funcionários no PDV, retorna vazio
      return { conversas: [], cursor: null, temMais: false };
    }
  } else {
    // EMPRESA: vê todos, apenas filtro por empresa já aplicado
    condicaoPerfil = Prisma.empty;
  }

  const condicaoBusca = busca
    ? Prisma.sql`AND (LOWER(l.nome) LIKE ${"%" + busca.toLowerCase() + "%"} OR l.telefone LIKE ${"%" + busca + "%"})`
    : Prisma.empty;

  const condicaoCursor = cursor
    ? Prisma.sql`AND ultima_msg < (SELECT MAX(timestamp) FROM "WhatsappMensagem" WHERE id_lead = ${cursor})`
    : Prisma.empty;

  const condicaoNaoLidas = apenasNaoLidas
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "WhatsappMensagem" wm2
        WHERE wm2.id_lead = l.id
        AND wm2.from_me = false
        AND wm2.lida_no_crm_em IS NULL
      )`
    : Prisma.empty;

  const leadsOrdenados = await prisma.$queryRaw<{ id: string }[]>`
    SELECT l.id
    FROM lead l
    INNER JOIN (
      SELECT id_lead, MAX(timestamp) as ultima_msg
      FROM "WhatsappMensagem"
      WHERE id_empresa = ${sessao.id_empresa}
      GROUP BY id_lead
    ) wm ON wm.id_lead = l.id
    WHERE l.id_empresa = ${sessao.id_empresa}
    ${condicaoPerfil}
    ${condicaoBusca}
    ${condicaoCursor}
    ${condicaoNaoLidas}
    ORDER BY wm.ultima_msg DESC
    LIMIT ${limite + 1}
  `;

  const temMais = leadsOrdenados.length > limite;
  const idsPaginados = temMais ? leadsOrdenados.slice(0, limite) : leadsOrdenados;

  if (idsPaginados.length === 0) {
    return { conversas: [], cursor: null, temMais: false };
  }

  const leadIds = idsPaginados.map((lead) => lead.id);
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: {
      id: true,
      nome: true,
      telefone: true,
      origem: true,
      estagio: { select: { nome: true } },
      whatsapp_mensagens: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: {
          conteudo: true,
          from_me: true,
          tipo: true,
          timestamp: true,
        },
      },
    },
  });

  const mapaLeads = new Map(leads.map((lead) => [lead.id, lead]));
  const leadsOrdenadosFinal = leadIds
    .map((id) => mapaLeads.get(id))
    .filter((lead): lead is NonNullable<typeof lead> => lead !== undefined);

  const contagensNaoLidas = await prisma.whatsappMensagem.groupBy({
    by: ["id_lead"],
    where: {
      id_lead: { in: leadIds },
      from_me: false,
      lida_no_crm_em: null,
      id_empresa: sessao.id_empresa,
    },
    _count: { id: true },
  });

  const mapaNaoLidas = new Map(contagensNaoLidas.map((item) => [item.id_lead, item._count.id]));

  return {
    conversas: leadsOrdenadosFinal.map((lead) => {
      const ultimaMsg = lead.whatsapp_mensagens[0] ?? null;
      const origemLead = (lead.origem ?? "MANUAL") as "MANUAL" | "SINCRONIZACAO_WHATSAPP" | "ANUNCIO_CTWA";

      return {
        leadId: lead.id,
        leadNome: lead.nome,
        leadTelefone: lead.telefone,
        leadOrigem: origemLead,
        estagioNome: lead.estagio?.nome ?? null,
        ultimaMensagem: ultimaMsg
          ? {
              conteudo: formatarPreviewMensagem(ultimaMsg.tipo, ultimaMsg.conteudo),
              fromMe: ultimaMsg.from_me,
              timestamp: ultimaMsg.timestamp,
            }
          : null,
        naoLidas: mapaNaoLidas.get(lead.id) ?? 0,
      };
    }),
    cursor: temMais ? idsPaginados[idsPaginados.length - 1].id : null,
    temMais,
  };
}

export function criarChaveChatStream(idEmpresa: string, idInstancia: string, leadId: string) {
  return `chat:${idEmpresa}:${idInstancia}:${leadId}`;
}

export function criarChaveConversasStream(idEmpresa: string, busca: string, naoLidas: boolean, limite: number) {
  return `conversation-list:${idEmpresa}:${busca || "_"}:${naoLidas ? "unread" : "all"}:${limite}`;
}
