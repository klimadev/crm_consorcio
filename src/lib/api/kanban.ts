import type { Estagio, Funcionario, Lead } from "@/modules/kanban/types";

type ApiErro = {
  erro?: string;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export type ListagemKanban = {
  estagios: Estagio[];
  leads: Lead[];
  funcionarios: Funcionario[];
  pdvs: Array<{ id: string; nome: string }>;
};

export type PayloadCriarLead = {
  nome: string;
  telefone: string;
  valor_consorcio: number;
  id_estagio: string;
  id_funcionario: string;
};

export type PayloadMoverLeadKanban = {
  id_estagio: string;
  motivo_perda?: string;
};

export type PayloadAtualizarLeadKanban = {
  observacoes: Lead["observacoes"];
  telefone: Lead["telefone"];
  valor_consorcio: number;
  documento_aprovacao_url: string | null;
  id_funcionario: Lead["id_funcionario"];
};

export type PayloadRedistribuirEmAtendimentoKanban = {
  minutosSemAtendimento?: number;
  limite?: number;
  id_pdv?: string;
  nomeEstagio?: string;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarKanban(): Promise<ResultadoApi<ListagemKanban>> {
  const resposta = await fetch("/api/leads");
  const json = await lerJsonSeguro<Partial<ListagemKanban> & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar dados do Kanban." };
  }

  return {
    ok: true,
    dados: {
      estagios: json.estagios ?? [],
      leads: json.leads ?? [],
      funcionarios: json.funcionarios ?? [],
      pdvs: json.pdvs ?? [],
    },
  };
}

export async function criarLeadKanban(payload: PayloadCriarLead): Promise<ResultadoApi<{ lead?: Lead }>> {
  const resposta = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ lead?: Lead } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao criar lead." };
  }

  return { ok: true, dados: { lead: json.lead } };
}

export async function sincronizarWhatsappKanban(params?: string): Promise<
  ResultadoApi<{
    criados: number;
    instancias_ignoradas: Array<{ id: string; nome: string; motivo: string }>;
    timestamp_sync: string;
  }>
> {
  const url = params ? `/api/leads/sync-whatsapp${params}` : "/api/leads/sync-whatsapp";
  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const json = await lerJsonSeguro<{
    criados?: number;
    instancias_ignoradas?: Array<{ id: string; nome: string; motivo: string }>;
    timestamp_sync?: string;
  } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao sincronizar contatos do WhatsApp." };
  }

  return {
    ok: true,
    dados: {
      criados: json.criados ?? 0,
      instancias_ignoradas: json.instancias_ignoradas ?? [],
      timestamp_sync: json.timestamp_sync ?? new Date().toISOString(),
    },
  };
}

export async function excluirLeadKanban(idLead: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/leads/${idLead}`, {
    method: "DELETE",
  });

  const json = await lerJsonSeguro<ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao excluir lead." };
  }

  return { ok: true, dados: null };
}

export async function moverLeadKanban(
  idLead: string,
  payload: PayloadMoverLeadKanban,
): Promise<ResultadoApi<{ lead?: Lead; mensagem?: string }>> {
  const resposta = await fetch(`/api/leads/${idLead}/mover`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ lead?: Lead; mensagem?: string } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Nao foi possivel mover o lead." };
  }

  return {
    ok: true,
    dados: {
      lead: json.lead,
      mensagem: json.mensagem,
    },
  };
}

export async function atualizarLeadKanban(
  idLead: string,
  payload: PayloadAtualizarLeadKanban,
): Promise<ResultadoApi<{ lead?: Lead }>> {
  const resposta = await fetch(`/api/leads/${idLead}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ lead?: Lead } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao salvar lead." };
  }

  return { ok: true, dados: { lead: json.lead } };
}

export async function uploadDocumentoKanban(arquivo: File): Promise<ResultadoApi<{ url: string }>> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const resposta = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const json = await lerJsonSeguro<{ url?: string } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao fazer upload." };
  }

  if (!json.url) {
    return { ok: false, erro: "Erro ao fazer upload." };
  }

  return { ok: true, dados: { url: json.url } };
}

export async function aprovarLeadKanban(idLead: string): Promise<ResultadoApi<{ lead?: Lead }>> {
  const resposta = await fetch(`/api/leads/${idLead}/aprovar`, {
    method: "POST",
  });

  const json = await lerJsonSeguro<{ lead?: Lead } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao aprovar lead." };
  }

  return { ok: true, dados: { lead: json.lead } };
}

type PendenciaInfoApi = {
  id: string;
  tipo: string;
  descricao: string;
  leadId?: string;
  leadNome?: string;
  leadTelefone?: string;
  funcionarioNome?: string;
  pdvNome?: string;
  estagioNome?: string;
  criadoEm?: string;
  updatedAt?: string;
  [chave: string]: unknown;
};

export async function listarPendenciasGlobaisKanban(): Promise<ResultadoApi<{ pendencias: PendenciaInfoApi[] }>> {
  try {
    const resposta = await fetch("/api/pendencias");
    const json = await lerJsonSeguro<{ pendencias?: PendenciaInfoApi[] } & ApiErro>(resposta);

    if (!resposta.ok) {
      return { ok: false, erro: json.erro ?? "Erro ao buscar pendências." };
    }

    return { ok: true, dados: { pendencias: json.pendencias ?? [] } };
  } catch (erro) {
    console.error("Erro de rede ao buscar pendências:", erro);
    return { ok: false, erro: "Erro de conexão. Verifique sua internet." };
  }
}

export async function redistribuirLeadsEmAtendimentoKanban(
  payload: PayloadRedistribuirEmAtendimentoKanban = {},
): Promise<
  ResultadoApi<{
    avaliados: number;
    elegiveis: number;
    reatribuidos: number;
    ignoradosSemDestino: number;
  }>
> {
  const resposta = await fetch("/api/leads/redistribuir-em-atendimento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{
    avaliados?: number;
    elegiveis?: number;
    reatribuidos?: number;
    ignoradosSemDestino?: number;
  } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao redistribuir leads em atendimento." };
  }

  return {
    ok: true,
    dados: {
      avaliados: json.avaliados ?? 0,
      elegiveis: json.elegiveis ?? 0,
      reatribuidos: json.reatribuidos ?? 0,
      ignoradosSemDestino: json.ignoradosSemDestino ?? 0,
    },
  };
}
