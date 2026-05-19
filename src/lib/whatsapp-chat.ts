import { prisma } from "@/lib/prisma";
import { whereLeadsPorPerfil } from "@/lib/permissoes";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { normalizarTimestampParaIso, traduzirTipoMensagem, extrairDadosAd, type DadosAd } from "@/lib/whatsapp-utils";
import { verificarSaudeInstancia } from "@/lib/evolution-api";
import type { SessaoToken } from "@/lib/tipos";
import type { Prisma } from "@prisma/client";
import type { ChatConnectionStatus, ChatMessageStatus, WhatsappChatMessage } from "@/modules/whatsapp/types";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_FETCH_TIMEOUT_MS = 5000;

type LeadComAcesso = {
  id: string;
  id_empresa: string;
  telefone: string;
  nome: string;
};

type InstanciaResolvida = {
  pdvId: string;
  pdvNome: string;
  id: string;
  instanceName: string;
};

type MensagemNormalizada = {
  messageId: string;
  remoteJid: string;
  remoteJidAlt: string | null;
  fromMe: boolean;
  kind:
    | "text"
    | "conversation"
    | "extendedTextMessage"
    | "imageMessage"
    | "videoMessage"
    | "audioMessage"
    | "documentMessage"
    | "stickerMessage"
    | "reactionMessage"
    | "listMessage"
    | "buttonsMessage"
    | "templateMessage"
    | "locationMessage"
    | "contactMessage"
    | "groupInviteMessage"
    | "liveLocationMessage"
    | "orderMessage"
    | "protocolMessage"
    | "unknown";
  tipoLabel: string;
  text: string;
  status: ChatMessageStatus;
  timestamp: number;
  timestampIso: string;
  dadosAd: DadosAd;
  error: string | null;
  payloadJson: string;
};

function extrairTexto(payload: Record<string, unknown>) {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") return { kind: "unknown" as const, text: "" };

  // Texto simples (conversation)
  if (typeof message.conversation === "string") {
    return { kind: "conversation" as const, text: message.conversation };
  }

  // Texto estendido (link, preview)
  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (extended && typeof extended.text === "string") {
    return { kind: "extendedTextMessage" as const, text: extended.text };
  }

  // Imagem
  if (message.imageMessage) {
    const img = message.imageMessage as Record<string, unknown>;
    const caption = typeof img.caption === "string" ? img.caption : "[Imagem]";
    return { kind: "imageMessage" as const, text: caption };
  }

  // Vídeo
  if (message.videoMessage) {
    const vid = message.videoMessage as Record<string, unknown>;
    const caption = typeof vid.caption === "string" ? vid.caption : "[Vídeo]";
    return { kind: "videoMessage" as const, text: caption };
  }

  // Áudio/Nota de voz
  if (message.audioMessage) {
    return { kind: "audioMessage" as const, text: "[Áudio]" };
  }

  // Documento
  if (message.documentMessage) {
    const doc = message.documentMessage as Record<string, unknown>;
    const fileName = typeof doc.fileName === "string" ? doc.fileName : "Documento";
    return { kind: "documentMessage" as const, text: `[Arquivo: ${fileName}]` };
  }

  // Sticker
  if (message.stickerMessage) {
    return { kind: "stickerMessage" as const, text: "[Sticker]" };
  }

  // Reação
  if (message.reactionMessage) {
    const reaction = message.reactionMessage as Record<string, unknown>;
    const emoji = typeof reaction.text === "string" ? reaction.text : "😀";
    return { kind: "reactionMessage" as const, text: `[Reação: ${emoji}]` };
  }

  // Lista
  if (message.listMessage) {
    const list = message.listMessage as Record<string, unknown>;
    const title = typeof list.title === "string" ? list.title : "Lista";
    return { kind: "listMessage" as const, text: `[Lista: ${title}]` };
  }

  // Botões
  if (message.buttonsMessage) {
    const btn = message.buttonsMessage as Record<string, unknown>;
    const content = typeof btn.contentText === "string" ? btn.contentText : "Botões";
    return { kind: "buttonsMessage" as const, text: `[Botões: ${content}]` };
  }

  // Template
  if (message.templateMessage) {
    return { kind: "templateMessage" as const, text: "[Template]" };
  }

  // Localização
  if (message.locationMessage) {
    const loc = message.locationMessage as Record<string, unknown>;
    const degrees = typeof loc.degreesLatitude === "number" ? `${loc.degreesLatitude}, ${loc.degreesLongitude}` : "Localização";
    return { kind: "locationMessage" as const, text: `[Localização: ${degrees}]` };
  }

  // Contato
  if (message.contactMessage) {
    const contact = message.contactMessage as Record<string, unknown>;
    const name = typeof contact.displayName === "string" ? contact.displayName : "Contato";
    return { kind: "contactMessage" as const, text: `[Contato: ${name}]` };
  }

  // Convite de grupo
  if (message.groupInviteMessage) {
    const group = message.groupInviteMessage as Record<string, unknown>;
    const groupName = typeof group.groupName === "string" ? group.groupName : "Grupo";
    return { kind: "groupInviteMessage" as const, text: `[Convite: ${groupName}]` };
  }

  // Live location
  if (message.liveLocationMessage) {
    return { kind: "liveLocationMessage" as const, text: "[Localização ao vivo]" };
  }

  // Order
  if (message.orderMessage) {
    const order = message.orderMessage as Record<string, unknown>;
    const id = typeof order.orderId === "string" ? order.orderId : "Pedido";
    return { kind: "orderMessage" as const, text: `[Pedido: ${id}]` };
  }

  // Status (stories)
  if (message.protocolMessage) {
    return { kind: "protocolMessage" as const, text: "[Mensagem de sistema]" };
  }

  // Catch-all para outros tipos não mapeados
  const tipoEncontrado = Object.keys(message)[0] || "unknown";
  return { kind: "unknown" as const, text: `[${tipoEncontrado}]` };
}

export function mapearStatusMensagem(rawStatus: unknown, fromMe: boolean): ChatMessageStatus {
  if (typeof rawStatus !== "string") {
    return fromMe ? "SENT" : "DELIVERED";
  }
  const normalized = rawStatus.toUpperCase();
  if (normalized.includes("ERROR") || normalized.includes("FAIL")) return "ERROR";
  if (normalized.includes("READ")) return "READ";
  if (normalized.includes("PLAYED")) return "PLAYED";
  if (normalized.includes("DELETE")) return "DELETED";
  if (normalized.includes("DELIVER")) return "DELIVERED";
  if (normalized.includes("SENT") || normalized.includes("SERVER_ACK")) return "SENT";
  if (normalized.includes("PENDING")) return "PENDING";
  return fromMe ? "SENT" : "DELIVERED";
}

function extrairStatusDaMensagem(raw: Record<string, unknown>): unknown {
  const messageUpdate = raw.MessageUpdate;
  if (Array.isArray(messageUpdate) && messageUpdate.length > 0) {
    const statusPriority: Record<string, number> = {
      READ: 4,
      PLAYED: 4,
      DELIVERY_ACK: 3,
      DELIVERED: 3,
      SERVER_ACK: 2,
      SENT: 2,
      PENDING: 1,
    };
    let strongestStatus: string | undefined;
    let highestPriority = 0;
    for (const update of messageUpdate) {
      if (update && typeof update === "object") {
        const status = (update as Record<string, unknown>).status;
        if (typeof status === "string") {
          const priority = statusPriority[status] ?? 0;
          if (priority > highestPriority) {
            highestPriority = priority;
            strongestStatus = status;
          }
        }
      }
    }
    if (strongestStatus) return strongestStatus;
  }
  return raw.status;
}

function forcarArrayMensagens(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const cast = payload as Record<string, unknown>;
    const candidates = [cast.messages, cast.data, cast.response, cast.result];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
      }
      if (candidate && typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;
        if (Array.isArray(nested.records)) {
          return nested.records.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
        }
      }
    }
  }
  return [];
}

export function normalizarMensagensEvolution(payload: unknown): MensagemNormalizada[] {
  return forcarArrayMensagens(payload)
    .map((raw): MensagemNormalizada | null => {
      const key = (raw.key ?? {}) as Record<string, unknown>;
      const remoteJid = typeof key.remoteJid === "string" ? key.remoteJid : "";
      const remoteJidAlt = typeof key.remoteJidAlt === "string" ? key.remoteJidAlt : null;
      const messageId = typeof key.id === "string" ? key.id : "";
      if (!remoteJid || !messageId) return null;

      const fromMe = Boolean(key.fromMe);
      const { kind, text } = extrairTexto(raw);
      const timestampRaw = raw.messageTimestamp;
      const timestamp = Number.parseInt(String(timestampRaw ?? Math.floor(Date.now() / 1000)), 10);
      const extractedStatus = extrairStatusDaMensagem(raw);

      // Extrair tipo de mensagem e dados do Ad
      const messageType = raw.messageType as string | null;
      const tipoLabel = traduzirTipoMensagem(messageType);
      const timestampIso = normalizarTimestampParaIso(timestamp);
      const dadosAd = extrairDadosAd(raw);

      return {
        messageId,
        remoteJid,
        remoteJidAlt,
        fromMe,
        kind,
        tipoLabel,
        text,
        status: mapearStatusMensagem(extractedStatus, fromMe),
        timestamp: Number.isNaN(timestamp) ? Math.floor(Date.now() / 1000) : timestamp,
        timestampIso,
        dadosAd,
        error: null,
        payloadJson: JSON.stringify(raw),
      };
    })
    .filter((item): item is MensagemNormalizada => item !== null);
}

function payloadHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  };
}

export async function buscarLeadComAcesso(sessao: SessaoToken, leadId: string): Promise<LeadComAcesso | null> {
  const whereLeads = await whereLeadsPorPerfil(sessao);
  return prisma.lead.findFirst({
    where: {
      ...whereLeads,
      id: leadId,
    },
    select: {
      id: true,
      id_empresa: true,
      telefone: true,
      nome: true,
    },
  });
}

export async function resolverInstanciaDoLead(idEmpresa: string, leadId: string): Promise<InstanciaResolvida | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      id_empresa: idEmpresa,
    },
    select: {
      funcionario: {
        select: {
            pdv: {
              select: {
                id: true,
                nome: true,
                id_whatsapp_instancia: true,
              },
            },
        },
      },
    },
  });

  const instanciaId = lead?.funcionario.pdv.id_whatsapp_instancia;
  if (!instanciaId) return null;

  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      id: instanciaId,
      id_empresa: idEmpresa,
    },
    select: { id: true, instance_name: true },
  });

  if (!instancia) return null;
  return {
    pdvId: lead.funcionario.pdv.id,
    pdvNome: lead.funcionario.pdv.nome,
    id: instancia.id,
    instanceName: instancia.instance_name,
  };
}

export async function buscarPdvDoLead(idEmpresa: string, leadId: string) {
  return prisma.lead.findFirst({
    where: {
      id: leadId,
      id_empresa: idEmpresa,
    },
    select: {
      funcionario: {
        select: {
          pdv: {
            select: {
              id: true,
              nome: true,
              id_whatsapp_instancia: true,
            },
          },
        },
      },
    },
  });
}

export function normalizarRemoteJidParaLead(telefone: string) {
  const normalizado = normalizarTelefoneParaWhatsapp(telefone);
  if (!normalizado.valido || !normalizado.waNumber) {
    return { ok: false as const, erro: normalizado.motivoErro ?? "Telefone invalido para WhatsApp." };
  }

  return {
    ok: true as const,
    waNumber: normalizado.waNumber,
    remoteJid: `${normalizado.waNumber}@s.whatsapp.net`,
  };
}

export async function buscarConnectionStatus(
  instanceName: string,
  dbInstanceId?: string,
): Promise<ChatConnectionStatus> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: payloadHeaders(),
    });
    if (!response.ok) return "offline";

    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const instance = (json.instance ?? json) as Record<string, unknown>;
    const state = String(instance.state ?? instance.status ?? "").toLowerCase();
    if (!state) return "unknown";
    if (state !== "open") return "offline";

    // Sinal 1: disconnectionReasonCode registrado indica que houve uma desconexao
    const rawDisconnection = instance.disconnectionReasonCode ?? json.disconnectionReasonCode ?? null;
    if (rawDisconnection !== null && rawDisconnection !== undefined) {
      return "degraded";
    }

    // Sinal 2: verifica se as ultimas mensagens enviadas tem erro consecutivo
    if (dbInstanceId) {
      const temErrosConsecutivos = await verificarErrosConsecutivosEnvio(dbInstanceId);
      if (temErrosConsecutivos) {
        return "degraded";
      }

      // Sinal 3: health probe com fetchProfile (detecta zombies que nao sao pegos pelos sinais 1 e 2)
      const phone = await obterPhoneDaInstancia(dbInstanceId);
      const saude = await verificarSaudeInstancia(instanceName, phone);
      if (!saude.saudavel) {
        return "degraded";
      }
    }

    return "online";
  } catch {
    return "offline";
  }
}

async function obterPhoneDaInstancia(dbInstanceId: string): Promise<string | null> {
  try {
    const i = await prisma.whatsappInstancia.findUnique({
      where: { id: dbInstanceId },
      select: { phone: true },
    });
    return i?.phone ?? null;
  } catch {
    return null;
  }
}

const JANELA_ERROS_RECENTES_MS = 15 * 60 * 1000;
const LIMITE_ERROS_CONSECUTIVOS = 3;

export async function verificarErrosConsecutivosEnvio(dbInstanceId: string): Promise<boolean> {
  try {
    const recentes = await prisma.whatsappMensagem.findMany({
      where: {
        id_whatsapp_instancia: dbInstanceId,
        from_me: true,
        criado_em: { gte: new Date(Date.now() - JANELA_ERROS_RECENTES_MS) },
      },
      orderBy: { criado_em: "desc" },
      take: LIMITE_ERROS_CONSECUTIVOS,
      select: { status: true },
    });

    if (recentes.length < LIMITE_ERROS_CONSECUTIVOS) return false;

    return recentes.every((m) => m.status === "ERROR");
  } catch {
    return false;
  }
}

export async function buscarMensagensEvolution(instanceName: string, remoteJid: string) {
  // Evolution API 2.3+: usa remoteJid e remoteJidAlt para buscar mensagens de um contato específico
  const telefoneBusca = remoteJid.replace(/\D/g, "");
  const telefoneFormatado = telefoneBusca ? `${telefoneBusca}@s.whatsapp.net` : remoteJid;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, EVOLUTION_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    // Payload correto para Evolution API 2.3+: usa where.key com remoteJid E remoteJidAlt
    response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers: payloadHeaders(),
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: telefoneFormatado,
            remoteJidAlt: telefoneFormatado,
          },
        },
        page: 1,
        offset: 80,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error("Erro ao buscar mensagens na Evolution API.");
  }

  return response.json().catch(() => ([]));
}

/**
 * Busca todas as mensagens de uma instância para extração otimizada de nomes e Ads
 * Evolution API 2.3+: usa paginação com page e offset
 * 
 * @param instanceName - Nome da instância na Evolution API
 * @param limitePorPagina - Número de mensagens por página (padrão: 500)
 * @returns Mapa de remoteJidAlt => { pushName, dadosAd, timestamp }
 */
export async function buscarTodasMensagensDaInstancia(
  instanceName: string,
  limitePorPagina: number = 500,
): Promise<Map<string, { pushName: string | null; dadosAd: DadosAd | null; timestamp: number; remoteJidAlt: string }>> {
  const mapaContatos = new Map<string, { pushName: string | null; dadosAd: DadosAd | null; timestamp: number; remoteJidAlt: string }>();
  
  let pagina = 1;
  let temMaisPaginas = true;

  while (temMaisPaginas) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, EVOLUTION_FETCH_TIMEOUT_MS * 2); // Timeout maior para paginação

    let response: Response;
    try {
      response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
        method: "POST",
        headers: payloadHeaders(),
        body: JSON.stringify({
          page: pagina,
          offset: limitePorPagina,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Erro ao buscar mensagens na Evolution API (página ${pagina}).`);
    }

    const json = await response.json().catch(() => ({}));
    const registros = json.messages?.records ?? json.records ?? [];

    if (registros.length === 0) {
      temMaisPaginas = false;
      break;
    }

    for (const msg of registros) {
      const key = (msg.key ?? {}) as Record<string, unknown>;
      const remoteJidAlt = typeof key.remoteJidAlt === "string" ? key.remoteJidAlt : null;
      
      if (!remoteJidAlt) continue;
      
      const fromMe = Boolean(key.fromMe);
      const pushName = fromMe ? null : (msg.pushName as string | null);
      const timestamp = Number(msg.messageTimestamp ?? 0);
      const dadosAd = extrairDadosAd(msg);

      // Só adiciona se for mensagem do lead (fromMe: false) ou se ainda não existir
      const existente = mapaContatos.get(remoteJidAlt);
      
      if (!existente || !fromMe) {
        // Se é mensagem do lead, atualiza com dados do lead
        if (!fromMe) {
          mapaContatos.set(remoteJidAlt, {
            pushName: pushName,
            dadosAd: dadosAd,
            timestamp: timestamp,
            remoteJidAlt,
          });
        } else if (!existente) {
          // Se é mensagem do CRM e não existe, cria entrada vazia
          mapaContatos.set(remoteJidAlt, {
            pushName: null,
            dadosAd: null,
            timestamp: 0,
            remoteJidAlt,
          });
        }
      }
    }

    const totalPaginas = json.messages?.pages ?? json.pages ?? 1;
    if (pagina >= totalPaginas) {
      temMaisPaginas = false;
    } else {
      pagina += 1;
    }
  }

  return mapaContatos;
}

/**
 * Extrai o nome do lead a partir do mapa de mensagens
 * Prioridade: pushName da primeira mensagem do lead (fromMe: false)
 */
export function extrairNomeDoLeadDoMapa(
  mapaMensagens: Map<string, { pushName: string | null; dadosAd: DadosAd | null; timestamp: number; remoteJidAlt: string }>,
  remoteJidAlt: string,
): string | null {
  const dados = mapaMensagens.get(remoteJidAlt);
  if (dados?.pushName && dados.pushName.trim().length > 0) {
    return dados.pushName.trim();
  }
  return null;
}

/**
 * Extrai dados do Ad a partir do mapa de mensagens
 */
export function extrairDadosAdDoMapa(
  mapaMensagens: Map<string, { pushName: string | null; dadosAd: DadosAd | null; timestamp: number; remoteJidAlt: string }>,
  remoteJidAlt: string,
): DadosAd | null {
  const dados = mapaMensagens.get(remoteJidAlt);
  return dados?.dadosAd ?? null;
}

export async function enviarMensagemEvolution(instanceName: string, number: string, text: string) {
  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: payloadHeaders(),
    body: JSON.stringify({ number: `+${number}`, text }),
  });

  if (!response.ok) {
    const erro = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const erroTexto =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar mensagem.";
    throw new Error(erroTexto);
  }

  return response.json().catch(() => ({}));
}

export async function enviarMidiaWhatsapp(
  instanceName: string,
  number: string,
  base64: string,
  fileName: string,
  mimeType: string,
  caption?: string,
) {
  const mediaType = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("video/")
      ? "video"
      : "document";

  const body: Record<string, unknown> = {
    number: `+${number}`,
    mediatype: mediaType,
    media: base64,
    fileName,
  };
  if (caption) body.caption = caption;

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: "POST",
    headers: payloadHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const erro = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const erroTexto =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar midia.";
    throw new Error(erroTexto);
  }

  return response.json().catch(() => ({}));
}

export async function enviarAudioWhatsapp(
  instanceName: string,
  number: string,
  audioBase64: string,
) {
  const response = await fetch(
    `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instanceName}`,
    {
      method: "POST",
      headers: payloadHeaders(),
      body: JSON.stringify({
        number: `+${number}`,
        audio: audioBase64,
      }),
    },
  );

  if (!response.ok) {
    const erro = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const erroTexto =
      typeof erro.message === "string"
        ? erro.message
        : typeof erro.error === "string"
          ? erro.error
          : "Erro ao enviar audio.";
    throw new Error(erroTexto);
  }

  return response.json().catch(() => ({}));
}

const statusWeight: Record<ChatMessageStatus, number> = {
  ERROR: 5,
  READ: 4,
  PLAYED: 4,
  DELIVERED: 3,
  DELETED: 3,
  SENT: 2,
  PENDING: 1,
};

export async function upsertMensagensNoBanco(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    idEmpresa: string;
    idLead: string;
    idWhatsappInstancia: string;
    mensagens: MensagemNormalizada[];
  },
) {
  if (params.mensagens.length === 0) return;

  const porMensagemId = new Map<string, MensagemNormalizada>();
  for (const mensagem of params.mensagens) {
    const existente = porMensagemId.get(mensagem.messageId);
    if (!existente || mensagem.timestamp >= existente.timestamp) {
      porMensagemId.set(mensagem.messageId, mensagem);
    }
  }

  const mensagensUnicas = Array.from(porMensagemId.values());
  const mensagemIds = mensagensUnicas.map((mensagem) => mensagem.messageId);

  const existentes = await tx.whatsappMensagem.findMany({
    where: {
      id_whatsapp_instancia: params.idWhatsappInstancia,
      mensagem_id: { in: mensagemIds },
    },
    select: {
      id: true,
      mensagem_id: true,
      status: true,
      tipo: true,
      conteudo: true,
      erro: true,
      payload_json: true,
    },
  });

  const existentePorMensagemId = new Map(existentes.map((registro) => [registro.mensagem_id, registro]));

  const paraCriar = mensagensUnicas
    .filter((mensagem) => !existentePorMensagemId.has(mensagem.messageId))
    .map((mensagem) => ({
      id_empresa: params.idEmpresa,
      id_lead: params.idLead,
      id_whatsapp_instancia: params.idWhatsappInstancia,
      mensagem_id: mensagem.messageId,
      remote_jid: mensagem.remoteJid,
      from_me: mensagem.fromMe,
      tipo: mensagem.kind,
      conteudo: mensagem.text,
      status: mensagem.status,
      timestamp: mensagem.timestamp,
      erro: mensagem.error,
      payload_json: mensagem.payloadJson,
    }));

  if (paraCriar.length > 0) {
    await tx.whatsappMensagem.createMany({
      data: paraCriar,
    });
  }

  for (const mensagem of mensagensUnicas) {
    const existente = existentePorMensagemId.get(mensagem.messageId);
    if (!existente) continue;

    const statusAtual = mapearStatusMensagem(existente.status, mensagem.fromMe);
    const statusFinal = escolherStatusMaisForte(statusAtual, mensagem.status);
    const precisaAtualizar =
      existente.tipo !== mensagem.kind ||
      (existente.conteudo ?? "") !== mensagem.text ||
      existente.status !== statusFinal ||
      (existente.erro ?? null) !== mensagem.error ||
      (existente.payload_json ?? null) !== mensagem.payloadJson;

    if (!precisaAtualizar) continue;

    await tx.whatsappMensagem.update({
      where: { id: existente.id },
      data: {
        tipo: mensagem.kind,
        conteudo: mensagem.text,
        status: statusFinal,
        erro: mensagem.error,
        payload_json: mensagem.payloadJson,
      },
    });
  }
}

export function mapearMensagemDbParaCanonica(registro: {
  id: string;
  id_lead: string;
  remote_jid: string;
  from_me: boolean;
  tipo: string;
  conteudo: string | null;
  status: string;
  timestamp: number;
  criado_em: Date;
  lida_no_crm_em: Date | null;
  erro: string | null;
  mensagem_id: string;
  payload_json?: string | null;
}): WhatsappChatMessage {
  const status = mapearStatusMensagem(registro.status, registro.from_me);
  const timestampIso = normalizarTimestampParaIso(registro.timestamp);

  const kind: WhatsappChatMessage["kind"] =
    registro.tipo === "text"
      ? "text"
      : registro.tipo === "audioMessage"
        ? "audio"
        : registro.tipo === "imageMessage"
          ? "image"
          : registro.tipo === "videoMessage"
            ? "video"
            : registro.tipo === "documentMessage"
              ? "document"
              : registro.tipo === "stickerMessage"
                ? "sticker"
                : (registro.tipo as WhatsappChatMessage["kind"]) ?? "unsupported";
  const tipoLabel = traduzirTipoMensagem(registro.tipo);

  let fileName: string | undefined;
  let mimeType: string | undefined;
  let mediaDuration: number | undefined;
  let caption: string | undefined;

  if (registro.payload_json) {
    try {
      const payload = JSON.parse(registro.payload_json) as Record<string, unknown>;
      const message = payload.message as Record<string, unknown> | undefined;

      if (message) {
        const docMsg = message.documentMessage as Record<string, unknown> | undefined;
        const imgMsg = message.imageMessage as Record<string, unknown> | undefined;
        const audMsg = message.audioMessage as Record<string, unknown> | undefined;
        const vidMsg = message.videoMessage as Record<string, unknown> | undefined;

        const mediaMsg = docMsg ?? imgMsg ?? audMsg ?? vidMsg;
        if (mediaMsg) {
          fileName = typeof mediaMsg.fileName === "string" ? mediaMsg.fileName : undefined;
          mimeType = typeof mediaMsg.mimetype === "string" ? mediaMsg.mimetype : undefined;
          mediaDuration =
            typeof mediaMsg.seconds === "number" && mediaMsg.seconds > 0
              ? mediaMsg.seconds
              : typeof mediaMsg.duration === "number" && mediaMsg.duration > 0
                ? mediaMsg.duration
                : undefined;
        }

        if (imgMsg || vidMsg || docMsg) {
          const possibleCaption = message.imageMessage ?? message.videoMessage ?? message.documentMessage;
          if (possibleCaption && typeof (possibleCaption as Record<string, unknown>).caption === "string") {
            caption = (possibleCaption as Record<string, unknown>).caption as string;
          }
        }
      }
    } catch {
      // ignora erro de parse
    }
  }

  return {
    id: registro.id,
    messageId: registro.mensagem_id,
    leadId: registro.id_lead,
    remoteJid: registro.remote_jid,
    remoteJidAlt: null,
    fromMe: registro.from_me,
    direction: registro.from_me ? "outgoing" : "incoming",
    text: registro.conteudo ?? "",
    kind,
    tipoLabel,
    status,
    timestamp: registro.timestamp,
    timestampIso,
    createdAtIso: registro.criado_em.toISOString(),
    readAtIso: registro.lida_no_crm_em ? registro.lida_no_crm_em.toISOString() : null,
    optimistic: false,
    error: registro.erro,
    dadosAd: null,
    fileName,
    mimeType,
    mediaDuration,
    caption,
  };
}

export function escolherStatusMaisForte(atual: ChatMessageStatus, proximo: ChatMessageStatus) {
  return statusWeight[proximo] >= statusWeight[atual] ? proximo : atual;
}

export async function marcarMensagensComoLidasEvolution(instanceName: string, mensagens: Array<{ remoteJid: string; id: string }>) {
  if (!mensagens.length) return;
  await fetch(`${EVOLUTION_API_URL}/chat/markMessageAsRead/${instanceName}`, {
    method: "POST",
    headers: payloadHeaders(),
    body: JSON.stringify({
      readMessages: mensagens.map((mensagem) => ({
        remoteJid: mensagem.remoteJid,
        id: mensagem.id,
        fromMe: false,
      })),
    }),
  }).catch(() => undefined);
}
