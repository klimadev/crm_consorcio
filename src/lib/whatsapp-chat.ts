import { prisma } from "@/lib/prisma";
import { whereLeadsPorPerfil } from "@/lib/permissoes";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
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
  kind: "text" | "unsupported";
  text: string;
  status: ChatMessageStatus;
  timestamp: number;
  error: string | null;
  payloadJson: string;
};

function extrairTexto(payload: Record<string, unknown>) {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") return { kind: "unsupported" as const, text: "" };
  if (typeof message.conversation === "string") return { kind: "text" as const, text: message.conversation };

  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (extended && typeof extended.text === "string") return { kind: "text" as const, text: extended.text };

  return { kind: "unsupported" as const, text: "[Mensagem nao suportada no MVP]" };
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

      return {
        messageId,
        remoteJid,
        remoteJidAlt,
        fromMe,
        kind,
        text,
        status: mapearStatusMensagem(extractedStatus, fromMe),
        timestamp: Number.isNaN(timestamp) ? Math.floor(Date.now() / 1000) : timestamp,
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

export async function buscarConnectionStatus(instanceName: string): Promise<ChatConnectionStatus> {
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
    return state === "open" ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function buscarMensagensEvolution(instanceName: string, remoteJid: string) {
  const telefoneBusca = remoteJid.replace(/\D/g, "");
  const where = telefoneBusca
    ? {
        OR: [
          { key: { remoteJid: `${telefoneBusca}@s.whatsapp.net` } },
          { key: { remoteJidAlt: `${telefoneBusca}@s.whatsapp.net` } },
        ],
      }
    : { key: { remoteJid } };

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, EVOLUTION_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers: payloadHeaders(),
      body: JSON.stringify({
        where,
        limit: 80,
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
}): WhatsappChatMessage {
  const status = mapearStatusMensagem(registro.status, registro.from_me);
  return {
    id: registro.id,
    messageId: registro.mensagem_id,
    leadId: registro.id_lead,
    remoteJid: registro.remote_jid,
    fromMe: registro.from_me,
    direction: registro.from_me ? "outgoing" : "incoming",
    text: registro.conteudo ?? "",
    kind: registro.tipo === "text" ? "text" : "unsupported",
    status,
    timestamp: registro.timestamp,
    createdAtIso: registro.criado_em.toISOString(),
    readAtIso: registro.lida_no_crm_em ? registro.lida_no_crm_em.toISOString() : null,
    optimistic: false,
    error: registro.erro,
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
