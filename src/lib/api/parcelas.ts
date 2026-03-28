type ApiErro = {
  erro?: string;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export type StatusParcela = "PENDENTE" | "PAGO" | "ATRASADO";

export type Parcela = {
  id: string;
  id_lead: string;
  numero_parcela: number;
  quantidade_total: number;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: StatusParcela;
};

export type ParcelaComLead = Parcela & {
  lead: {
    id: string;
    nome: string;
    telefone: string;
    valor_consorcio: number;
  };
};

export type PayloadGerarParcelas = {
  id_lead: string;
  valor_parcela: number;
  quantidade_parcelas: number;
  data_primeiro_vencimento: string;
};

export type PayloadPagarParcela = {
  data_pagamento: string;
};

export type PayloadAtualizarParcela = {
  valor?: number;
  data_vencimento?: string;
  data_pagamento?: string | null;
  status?: "PENDENTE" | "PAGO";
};

export type TabFinanceiro = "proximos" | "atrasados" | "recebidos";

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarParcelasLead(idLead: string): Promise<ResultadoApi<{ parcelas: Parcela[] }>> {
  const resposta = await fetch(`/api/parcelas?id_lead=${idLead}`);
  const json = await lerJsonSeguro<{ parcelas?: Parcela[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar parcelas do lead." };
  }

  return { ok: true, dados: { parcelas: json.parcelas ?? [] } };
}

export async function listarParcelasDashboard(tab: TabFinanceiro): Promise<ResultadoApi<{ parcelas: ParcelaComLead[] }>> {
  const resposta = await fetch(`/api/parcelas?tab=${tab}`);
  const json = await lerJsonSeguro<{ parcelas?: ParcelaComLead[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar parcelas do financeiro." };
  }

  return { ok: true, dados: { parcelas: json.parcelas ?? [] } };
}

export async function gerarParcelas(payload: PayloadGerarParcelas): Promise<ResultadoApi<{ parcelas_criadas: number }>> {
  const resposta = await fetch("/api/parcelas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ parcelas_criadas?: number } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao gerar plano de parcelas." };
  }

  return { ok: true, dados: { parcelas_criadas: json.parcelas_criadas ?? 0 } };
}

export async function pagarParcela(idParcela: string, payload: PayloadPagarParcela): Promise<ResultadoApi<{ parcela: Parcela }>> {
  const resposta = await fetch(`/api/parcelas/${idParcela}/pagar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ parcela?: Parcela } & ApiErro>(resposta);
  if (!resposta.ok || !json.parcela) {
    return { ok: false, erro: json.erro ?? "Erro ao registrar pagamento da parcela." };
  }

  return { ok: true, dados: { parcela: json.parcela } };
}

export async function atualizarParcela(idParcela: string, payload: PayloadAtualizarParcela): Promise<ResultadoApi<{ parcela: Parcela }>> {
  const resposta = await fetch(`/api/parcelas/${idParcela}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ parcela?: Parcela } & ApiErro>(resposta);
  if (!resposta.ok || !json.parcela) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar parcela." };
  }

  return { ok: true, dados: { parcela: json.parcela } };
}

export async function excluirParcelasLead(idLead: string): Promise<ResultadoApi<{ excluidas: number; preservadas_pagas: number }>> {
  const resposta = await fetch(`/api/parcelas?id_lead=${encodeURIComponent(idLead)}`, {
    method: "DELETE",
  });

  const json = await lerJsonSeguro<{ excluidas?: number; preservadas_pagas?: number } & ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao excluir parcelas do lead." };
  }

  return { ok: true, dados: { excluidas: json.excluidas ?? 0, preservadas_pagas: json.preservadas_pagas ?? 0 } };
}
