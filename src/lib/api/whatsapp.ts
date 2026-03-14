import type {
  ChatConnectionStatus,
  EstagioFunilOption,
  WhatsappAutomacao,
  WhatsappAutomacaoCreateInput,
  WhatsappAutomacaoUpdateInput,
  WhatsappChatMessage,
  WhatsappFollowUpDispatchResultado,
  WhatsappInstancia,
  WhatsappJobItem,
} from "@/modules/whatsapp/types";

type ApiErro = { erro?: string };

type ChatApiErro = ApiErro & {
  codigo?: string;
  pdv?: { id: string; nome: string } | null;
  rotaConfiguracao?: string | null;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

type WhatsappConexaoPayload = {
  qrCode?: string | null;
  pairingCode?: string | null;
  status?: string;
  conectado?: boolean;
  origem?: "status" | "restart" | "connect";
  phone?: string | null;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarInstanciasWhatsapp(): Promise<ResultadoApi<{ instancias: WhatsappInstancia[] }>> {
  const resposta = await fetch("/api/whatsapp/instances");
  const json = await lerJsonSeguro<{ instancias?: WhatsappInstancia[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar instâncias." };
  }

  return { ok: true, dados: { instancias: json.instancias ?? [] } };
}

export type WhatsappStats = {
  total: number;
  ativas: number;
  instancias: Array<{
    id: string;
    instance_name: string;
    status: string;
  }>;
};

export async function obterWhatsappStats(): Promise<ResultadoApi<WhatsappStats>> {
  const resposta = await fetch("/api/whatsapp/stats");
  const json = await lerJsonSeguro<WhatsappStats & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar estatísticas do WhatsApp." };
  }

  return { ok: true, dados: json };
}

export async function obterQrCodeWhatsapp(id: string): Promise<ResultadoApi<{ qrCode: string | null }>> {
  const resposta = await fetch(`/api/whatsapp/instances/${id}/qrcode`, { method: "GET" });
  const json = await lerJsonSeguro<WhatsappConexaoPayload & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar QR Code." };
  }

  return { ok: true, dados: { qrCode: json.qrCode ?? null } };
}

export async function reconectarInstanciaWhatsapp(id: string): Promise<
  ResultadoApi<{
    instancia: WhatsappInstancia | null;
    qrCode: string | null;
    pairingCode: string | null;
    status: string;
    conectado: boolean;
    origem: "status" | "restart" | "connect" | null;
  }>
> {
  const resposta = await fetch(`/api/whatsapp/instances/${id}/reconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const json = await lerJsonSeguro<WhatsappConexaoPayload & { instancia?: WhatsappInstancia | null } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao reconectar instância." };
  }

  return {
    ok: true,
    dados: {
      instancia: json.instancia ?? null,
      qrCode: json.qrCode ?? null,
      pairingCode: json.pairingCode ?? null,
      status: json.status ?? "unknown",
      conectado: json.conectado === true,
      origem: json.origem ?? null,
    },
  };
}

export async function criarInstanciaWhatsapp(nome: string): Promise<
  ResultadoApi<{ instancia: WhatsappInstancia | null; qrCode: string | null }>
> {
  const resposta = await fetch("/api/whatsapp/instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  const json = await lerJsonSeguro<{ instancia?: WhatsappInstancia; qrCode?: string } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao criar instância." };
  }

  return {
    ok: true,
    dados: {
      instancia: json.instancia ?? null,
      qrCode: json.qrCode ?? null,
    },
  };
}

export async function excluirInstanciaWhatsapp(id: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/whatsapp/instances/${id}`, { method: "DELETE" });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao excluir instância." };
  }

  return { ok: true, dados: null };
}

export async function atualizarStatusInstanciaWhatsapp(id: string): Promise<ResultadoApi<{ instancia: WhatsappInstancia | null }>> {
  const resposta = await fetch(`/api/whatsapp/instances/${id}`, { method: "PATCH" });
  const json = await lerJsonSeguro<{ instancia?: WhatsappInstancia } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar status da instância." };
  }

  return { ok: true, dados: { instancia: json.instancia ?? null } };
}

type ChatApiResponse = {
  messages?: WhatsappChatMessage[];
  connectionStatus?: ChatConnectionStatus;
  unreadCount?: number;
};

export async function listarMensagensWhatsapp(
  leadId: string,
  signal?: AbortSignal,
) : Promise<
  | { ok: true; dados: { messages: WhatsappChatMessage[]; connectionStatus: ChatConnectionStatus; unreadCount: number } }
  | { ok: false; erro: string; codigo?: string; pdv?: { id: string; nome: string } | null; rotaConfiguracao?: string | null }
> {
  const resposta = await fetch(`/api/whatsapp/chat/messages?leadId=${leadId}`, { signal, cache: "no-store" });
  const json = await lerJsonSeguro<ChatApiResponse & ChatApiErro>(resposta);

  if (!resposta.ok) {
    return {
      ok: false,
      erro: json.erro ?? "Erro ao carregar mensagens.",
      codigo: json.codigo,
      pdv: json.pdv,
      rotaConfiguracao: json.rotaConfiguracao,
    };
  }

  return {
    ok: true,
    dados: {
      messages: json.messages ?? [],
      connectionStatus: json.connectionStatus ?? "unknown",
      unreadCount: json.unreadCount ?? 0,
    },
  };
}

export async function enviarMensagemWhatsapp(payload: {
  leadId: string;
  text: string;
  clientTempId: string;
}): Promise<
  | { ok: true; dados: { message: WhatsappChatMessage; clientTempId: string } }
  | { ok: false; erro: string; codigo?: string; pdv?: { id: string; nome: string } | null; rotaConfiguracao?: string | null }
> {
  const resposta = await fetch("/api/whatsapp/chat/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<{ message?: WhatsappChatMessage; clientTempId?: string } & ChatApiErro>(resposta);

  if (!resposta.ok || !json.message) {
    return {
      ok: false,
      erro: json.erro ?? "Erro ao enviar mensagem.",
      codigo: json.codigo,
      pdv: json.pdv,
      rotaConfiguracao: json.rotaConfiguracao,
    };
  }

  return {
    ok: true,
    dados: {
      message: json.message,
      clientTempId: json.clientTempId ?? payload.clientTempId,
    },
  };
}

export async function marcarMensagensComoLidas(leadId: string): Promise<ResultadoApi<{ unreadCount: number }>> {
  const resposta = await fetch("/api/whatsapp/chat/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId }),
  });
  const json = await lerJsonSeguro<{ unreadCount?: number } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao marcar mensagens como lidas." };
  }

  return { ok: true, dados: { unreadCount: json.unreadCount ?? 0 } };
}

export async function listarAutomacoesWhatsapp(): Promise<ResultadoApi<{ automacoes: WhatsappAutomacao[] }>> {
  const resposta = await fetch("/api/whatsapp/automations");
  const json = await lerJsonSeguro<{ automacoes?: WhatsappAutomacao[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar automações." };
  }

  return { ok: true, dados: { automacoes: json.automacoes ?? [] } };
}

export async function criarAutomacaoWhatsapp(
  data: WhatsappAutomacaoCreateInput,
): Promise<ResultadoApi<{ automacao: WhatsappAutomacao | null }>> {
  const resposta = await fetch("/api/whatsapp/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await lerJsonSeguro<{ automacao?: WhatsappAutomacao } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao criar automação." };
  }

  return { ok: true, dados: { automacao: json.automacao ?? null } };
}

export async function atualizarAutomacaoWhatsapp(
  id: string,
  data: WhatsappAutomacaoUpdateInput,
): Promise<ResultadoApi<{ automacao: WhatsappAutomacao | null }>> {
  const resposta = await fetch(`/api/whatsapp/automations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await lerJsonSeguro<{ automacao?: WhatsappAutomacao } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar automação." };
  }

  return { ok: true, dados: { automacao: json.automacao ?? null } };
}

export async function gerarPreviewAutomacaoWhatsapp(mensagem: string): Promise<ResultadoApi<{ preview: string | null }>> {
  const resposta = await fetch("/api/whatsapp/automations/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem }),
  });
  const json = await lerJsonSeguro<{ preview?: string } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao gerar preview." };
  }

  return { ok: true, dados: { preview: typeof json.preview === "string" ? json.preview : null } };
}

export async function dispararDispatchFollowUpWhatsapp(limite = 50): Promise<ResultadoApi<WhatsappFollowUpDispatchResultado>> {
  const resposta = await fetch("/api/whatsapp/automations/follow-up/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limite }),
  });
  const json = await lerJsonSeguro<Partial<WhatsappFollowUpDispatchResultado> & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao processar follow-ups." };
  }

  return {
    ok: true,
    dados: {
      runId: typeof json.runId === "string" ? json.runId : "dispatch-sem-id",
      processados: typeof json.processados === "number" ? json.processados : 0,
      enviados: typeof json.enviados === "number" ? json.enviados : 0,
      falhas: typeof json.falhas === "number" ? json.falhas : 0,
      detalhes: Array.isArray(json.detalhes) ? json.detalhes : [],
      metrics: json.metrics,
    },
  };
}

export async function excluirAutomacaoWhatsapp(id: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/whatsapp/automations/${id}`, { method: "DELETE" });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao excluir automação." };
  }

  return { ok: true, dados: null };
}

export async function listarJobsWhatsapp(): Promise<
  ResultadoApi<{
    resumo: { pendentes: number; processando: number; falhas: number; enviadosHoje: number; atualizadoEm: string };
    agendamentos: WhatsappJobItem[];
  }>
> {
  const resposta = await fetch("/api/whatsapp/agendamentos?lista=true&limite=50");
  const json = await lerJsonSeguro<
    {
      resumo?: {
        pendentes?: number;
        processando?: number;
        falhas?: number;
        enviadosHoje?: number;
        atualizadoEm?: string;
      };
      agendamentos?: WhatsappJobItem[];
    } & ApiErro
  >(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar jobs do WhatsApp." };
  }

  return {
    ok: true,
    dados: {
      resumo: {
        pendentes: typeof json.resumo?.pendentes === "number" ? json.resumo.pendentes : 0,
        processando: typeof json.resumo?.processando === "number" ? json.resumo.processando : 0,
        falhas: typeof json.resumo?.falhas === "number" ? json.resumo.falhas : 0,
        enviadosHoje: typeof json.resumo?.enviadosHoje === "number" ? json.resumo.enviadosHoje : 0,
        atualizadoEm: typeof json.resumo?.atualizadoEm === "string" ? json.resumo.atualizadoEm : "",
      },
      agendamentos: Array.isArray(json.agendamentos) ? json.agendamentos : [],
    },
  };
}

export async function listarEstagiosFunil(): Promise<ResultadoApi<{ estagios: EstagioFunilOption[] }>> {
  const resposta = await fetch("/api/estagios");
  const json = await lerJsonSeguro<{ estagios?: EstagioFunilOption[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar estagios." };
  }

  return { ok: true, dados: { estagios: Array.isArray(json.estagios) ? json.estagios : [] } };
}
