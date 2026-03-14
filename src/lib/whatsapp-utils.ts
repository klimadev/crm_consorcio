/**
 * Utilitários para Evolution API 2.3+
 * Contém normalizadores de dados, extratores e funções auxiliares
 */

import type { ChatMessageStatus } from "@/modules/whatsapp/types";

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Mapeamento de tipos de mensagem da Evolution API para labels de interface
 */
export const MAPEAMENTO_TIPOS_MENSAGEM: Record<string, string> = {
  conversation: "Texto",
  extendedTextMessage: "Texto",
  imageMessage: "Imagem",
  videoMessage: "Vídeo",
  audioMessage: "Áudio",
  documentMessage: "Arquivo",
  stickerMessage: "Sticker",
  reactionMessage: "Reação",
  locationMessage: "Localização",
  contactsArrayMessage: "Contato",
  contactsMessage: "Contato",
  listMessage: "Lista",
  buttonsMessage: "Botões",
  templateMessage: "Template",
  groupInviteMessage: "Convite de Grupo",
  ephemeralMessage: "Ephemeral",
  orderMessage: "Pedido",
  paymentInviteMessage: "Pagamento",
  liveLocationMessage: "Localização ao Vivo",
  pollingCreationMessage: "Enquete",
  futureproofMessage: "Mensagem Futura",
  // Fallback
  unknown: "Desconhecido",
};

/**
 * Labels amigáveis para tipos de mensagem
 */
export function traduzirTipoMensagem(messageType: string | null | undefined): string {
  if (!messageType) return "Desconhecido";
  return MAPEAMENTO_TIPOS_MENSAGEM[messageType] ?? "Desconhecido";
}

// ============================================================================
// NORMALIZAÇÃO DE DATAS
// ============================================================================

/**
 * Converte Unix Timestamp (segundos) para ISO 8601
 * A Evolution API retorna messageTimestamp em segundos, não milissegundos
 */
export function normalizarTimestampParaIso(timestamp: number | null | undefined): string {
  if (!timestamp || typeof timestamp !== "number") {
    return new Date().toISOString();
  }
  
  // Unix timestamp pode vir em segundos ou milissegundos
  // Se for muito pequeno, provavelmente é em segundos
  const timestampMs = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  
  return new Date(timestampMs).toISOString();
}

/**
 * Converte Unix Timestamp para objeto Date
 */
export function normalizarTimestampParaDate(timestamp: number | null | undefined): Date {
  if (!timestamp || typeof timestamp !== "number") {
    return new Date();
  }
  
  const timestampMs = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(timestampMs);
}

/**
 * Formata timestamp para exibição em formato brasileiro
 */
export function formatarDataBr(timestamp: number | null | undefined): string {
  const data = normalizarTimestampParaDate(timestamp);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata timestamp para exibição de hora apenas
 */
export function formatarHoraBr(timestamp: number | null | undefined): string {
  const data = normalizarTimestampParaDate(timestamp);
  return data.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata data/hora estilo WhatsApp para mensagens
 * - Mesmo dia: apenas hora (14:32)
 * - Ontem: "Ontem 14:32"
 * - Esta semana: "Segunda 14:32"
 * - Este ano: "25/03 14:32"
 * - Ano diferente: "25/03/2025 14:32"
 */
export function formatarDataMensagemWhatsapp(timestamp: number | null | undefined): string {
  const data = normalizarTimestampParaDate(timestamp);
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dataMsg = new Date(data.getFullYear(), data.getMonth(), data.getDate());

  const diffDias = Math.floor((hoje.getTime() - dataMsg.getTime()) / (1000 * 60 * 60 * 24));

  const hora = data.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Mesmo dia
  if (diffDias === 0) {
    return hora;
  }

  // Ontem
  if (diffDias === 1) {
    return `Ontem ${hora}`;
  }

  // Esta semana (2 a 6 dias atrás)
  if (diffDias > 1 && diffDias < 7) {
    const diaSemana = data.toLocaleString("pt-BR", { weekday: "long" });
    // Capitalize first letter
    const diaSemanaFormatado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    return `${diaSemanaFormatado} ${hora}`;
  }

  // Este ano
  if (data.getFullYear() === agora.getFullYear()) {
    const diaMes = data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${diaMes} ${hora}`;
  }

  // Ano diferente
  const diaMesAno = data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${diaMesAno} ${hora}`;
}

/**
 * Retorna label do separador de data estilo WhatsApp
 * Ex: "25 de Março de 2025"
 */
export function formatarLabelSeparadorData(timestamp: number | null | undefined): string {
  const data = normalizarTimestampParaDate(timestamp);
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dataMsg = new Date(data.getFullYear(), data.getMonth(), data.getDate());

  const diffDias = Math.floor((hoje.getTime() - dataMsg.getTime()) / (1000 * 60 * 60 * 24));

  // Hoje
  if (diffDias === 0) {
    return "Hoje";
  }

  // Ontem
  if (diffDias === 1) {
    return "Ontem";
  }

  // Esta semana
  if (diffDias > 1 && diffDias < 7) {
    const diaSemana = data.toLocaleString("pt-BR", { weekday: "long" });
    return diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  }

  // Este ano
  if (data.getFullYear() === agora.getFullYear()) {
    return data.toLocaleString("pt-BR", { day: "numeric", month: "long" });
  }

  // Ano diferente
  return data.toLocaleString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

// ============================================================================
// EXTRAÇÃO DE NOME (pushName)
// ============================================================================

/**
 * Tipo para resultado da extração de nome
 */
export type ResultadoExtracaoNome = {
  nome: string;
  origem: "pushName" | "chat" | "telefone";
  confianca: "alta" | "media" | "baixa";
};

/**
 * Extrai o nome do lead a partir de uma mensagem
 * Segue ordem de prioridade: pushName > chat.pushName > telefone
 */
export function extrairNomeDoLead(
  mensagem: Record<string, unknown>,
  telefoneFormatado?: string,
): ResultadoExtracaoNome {
  const key = (mensagem.key ?? {}) as Record<string, unknown>;
  const pushName = mensagem.pushName as string | null | undefined;
  const fromMe = Boolean(key.fromMe);

  // Se a mensagem é do lead (fromMe: false), o pushName é confiável
  if (!fromMe && pushName && pushName.trim().length > 0) {
    return {
      nome: pushName.trim(),
      origem: "pushName",
      confianca: "alta",
    };
  }

  // Se a mensagem é do CRM (fromMe: true), não usamos o pushName
  // Precisaríamos buscar a primeira mensagem do lead

  return {
    nome: telefoneFormatado ?? "Sem nome",
    origem: telefoneFormatado ? "telefone" : "chat",
    confianca: telefoneFormatado ? "media" : "baixa",
  };
}

// ============================================================================
// EXTRAÇÃO DE DADOS DE AD (Click to WhatsApp)
// ============================================================================

/**
 * Tipo para dados do Ad extraídos de uma mensagem
 */
export type DadosAd = {
  titulo: string | null;
  corpo: string | null;
  urlOrigem: string | null;
  idConversao: string | null;
  urlThumbnail: string | null;
  tipoOrigem: string | null;
  appOrigem: string | null;
  formato: "ctwa" | null;
} | null;

/**
 * Extrai dados de publicidade (Click to WhatsApp Ads) de uma mensagem
 * Inspeciona contextInfo.externalAdReply
 */
export function extrairDadosAd(mensagem: Record<string, unknown>): DadosAd {
  const contextInfo = (mensagem.contextInfo ?? mensagem.messageContextInfo) as Record<string, unknown> | null;

  if (!contextInfo || typeof contextInfo !== "object") {
    return null;
  }

  const externalAdReply = contextInfo.externalAdReply as Record<string, unknown> | null;

  if (!externalAdReply || typeof externalAdReply !== "object") {
    return null;
  }

  const titulo = externalAdReply.title as string | null;
  const corpo = externalAdReply.body as string | null;
  const urlOrigem = externalAdReply.sourceUrl as string | null;
  const idConversao = externalAdReply.ctwaClid as string | null;
  const urlThumbnail = externalAdReply.thumbnailUrl as string | null;
  const tipoOrigem = externalAdReply.sourceType as string | null;
  const appOrigem = externalAdReply.sourceApp as string | null;

  // Verifica se é realmente um ad (CTWA)
  const isAd = tipoOrigem === "ad" || urlOrigem?.includes("fb.me") || urlOrigem?.includes("facebook.com");

  if (!isAd && !idConversao) {
    return null;
  }

  return {
    titulo,
    corpo,
    urlOrigem,
    idConversao,
    urlThumbnail,
    tipoOrigem,
    appOrigem,
    formato: isAd || idConversao ? "ctwa" : null,
  };
}

/**
 * Verifica se uma mensagem tem origem em anúncio
 */
export function mensagemTemOrigemAd(mensagem: Record<string, unknown>): boolean {
  const dadosAd = extrairDadosAd(mensagem);
  return dadosAd !== null;
}

// ============================================================================
// TIPAGENS PARA MENSAGENS CRUAS (EVOLUTION API 2.3+)
// ============================================================================

/**
 * Tipo completo de uma mensagem recebida da Evolution API 2.3+
 */
export interface EvolutionMensagemCrua {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
    participant?: string;
    remoteJidAlt: string;
    addressingMode: string;
  };
  pushName: string;
  messageType: string;
  message: Record<string, unknown>;
  messageTimestamp: number;
  instanceId: string;
  source: string;
  contextInfo: Record<string, unknown> | null;
  MessageUpdate?: Array<Record<string, unknown>>;
}

/**
 * Tipo para resposta paginada da Evolution API
 */
export interface EvolutionMensagensResponse {
  messages?: {
    records: EvolutionMensagemCrua[];
    pages?: number;
    total?: number;
  };
}

/**
 * Tipo para estrutura do where em findMessages
 */
export interface EvolutionFindMessagesWhere {
  key?: {
    remoteJid?: string;
    remoteJidAlt?: string;
  };
}

// ============================================================================
// MAPEAMENTO DE STATUS
// ============================================================================

/**
 * Mapeia status cru da Evolution API para tipo do CRM
 */
export function mapearStatusMensagemCru(
  rawStatus: unknown,
  fromMe: boolean,
): ChatMessageStatus {
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

// ============================================================================
// EXTRAÇÃO DE TEXTO DA MENSAGEM
// ============================================================================

/**
 * Tipo para texto extraído de uma mensagem
 */
export type TextoExtraido = {
  kind: "text" | "unsupported";
  text: string;
};

/**
 * Extrai texto de qualquer tipo de mensagem da Evolution API
 */
export function extrairTextoMensagem(payload: Record<string, unknown>): TextoExtraido {
  const message = payload.message as Record<string, unknown> | undefined;

  if (!message || typeof message !== "object") {
    return { kind: "unsupported", text: "" };
  }

  // Texto simples (conversation)
  if (typeof message.conversation === "string") {
    return { kind: "text", text: message.conversation };
  }

  // Texto estendido (resposta a mensagem)
  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (extended && typeof extended.text === "string") {
    return { kind: "text", text: extended.text };
  }

  // Mensagem com caption (imagem, vídeo, etc.)
  const imageMsg = message.imageMessage as Record<string, unknown> | undefined;
  if (imageMsg && typeof imageMsg.caption === "string") {
    return { kind: "text", text: imageMsg.caption };
  }

  const videoMsg = message.videoMessage as Record<string, unknown> | undefined;
  if (videoMsg && typeof videoMsg.caption === "string") {
    return { kind: "text", text: videoMsg.caption };
  }

  // Falback para outros tipos
  return { kind: "unsupported", text: "[Mensagem não suportada]" };
}

// ============================================================================
// UTILITÁRIOS DE REMOTE JID
// ============================================================================

/**
 * Normaliza remoteJid para formato padrão WhatsApp
 */
export function normalizarRemoteJid(jid: string | null | undefined): string {
  if (!jid || typeof jid !== "string") return "";
  return jid.replace("@lid", "@s.whatsapp.net");
}

/**
 * Extrai telefone de um remoteJid
 */
export function extrairTelefoneDeRemoteJid(jid: string | null | undefined): string {
  if (!jid || typeof jid !== "string") return "";
  return jid.replace("@s.whatsapp.net", "").replace("@lid", "").replace(/\D/g, "");
}

/**
 * Verifica se JID é um grupo
 */
export function ehGrupo(jid: string | null | undefined): boolean {
  if (!jid || typeof jid !== "string") return false;
  return jid.includes("@g.us");
}

/**
 * Verifica se JID é um broadcast de status
 */
export function ehStatusBroadcast(jid: string | null | undefined): boolean {
  if (!jid || typeof jid !== "string") return false;
  return jid === "status@broadcast";
}
