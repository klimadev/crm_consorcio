import type {
  AcaoLote,
  Funcionario,
  KpisEquipe,
  Paginacao,
  Pdv,
  ResultadoLote,
  WhatsappInstancia,
} from "@/modules/equipe/types";

type ApiErro = { erro?: string };

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

type ListagemEquipe = {
  funcionarios: Funcionario[];
  paginacao: Paginacao;
  kpis: KpisEquipe;
  kpis_totais?: KpisEquipe;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarEquipe(queryString: string): Promise<ResultadoApi<ListagemEquipe>> {
  const resposta = await fetch(`/api/funcionarios?${queryString}`);
  const json = await lerJsonSeguro<Partial<ListagemEquipe> & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar equipe." };
  }

  const funcionarios = json.funcionarios ?? [];
  const paginacao =
    json.paginacao ??
    ({
      pagina: 1,
      por_pagina: 20,
      total: funcionarios.length,
      total_paginas: 1,
    } satisfies Paginacao);
  const kpis =
    json.kpis ??
    ({
      total: funcionarios.length,
      ativos: funcionarios.filter((funcionario) => funcionario.ativo).length,
      inativos: funcionarios.filter((funcionario) => !funcionario.ativo).length,
      gerentes: funcionarios.filter((funcionario) => funcionario.cargo === "GERENTE").length,
      colaboradores: funcionarios.filter((funcionario) => funcionario.cargo === "COLABORADOR").length,
    } satisfies KpisEquipe);

  return {
    ok: true,
    dados: {
      funcionarios,
      paginacao,
      kpis,
      kpis_totais: json.kpis_totais,
    },
  };
}

export async function listarPdvs(): Promise<ResultadoApi<{ pdvs: Pdv[] }>> {
  const resposta = await fetch("/api/pdvs", { cache: "no-store" });
  const json = await lerJsonSeguro<{ pdvs?: Pdv[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar PDVs." };
  }

  return { ok: true, dados: { pdvs: json.pdvs ?? [] } };
}

export async function listarInstanciasWhatsapp(): Promise<ResultadoApi<{ instancias: WhatsappInstancia[] }>> {
  const resposta = await fetch("/api/whatsapp/instances", { cache: "no-store" });
  const json = await lerJsonSeguro<{ instancias?: WhatsappInstancia[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar instancias." };
  }

  return { ok: true, dados: { instancias: json.instancias ?? [] } };
}

export async function criarPdv(nome: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch("/api/pdvs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao criar PDV." };
  }

  return { ok: true, dados: null };
}

export async function editarPdv(
  id: string,
  nome: string,
  idWhatsappInstancia?: string | null,
): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/pdvs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, id_whatsapp_instancia: idWhatsappInstancia }),
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao editar PDV." };
  }

  return { ok: true, dados: null };
}

export async function excluirPdv(id: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/pdvs/${id}`, {
    method: "DELETE",
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao excluir PDV." };
  }

  return { ok: true, dados: null };
}

type PayloadCriarFuncionario = {
  nome: FormDataEntryValue | null;
  email: FormDataEntryValue | null;
  senha: FormDataEntryValue | null;
  cargo: FormDataEntryValue | null;
  id_pdv: FormDataEntryValue | null;
};

export async function criarFuncionario(payload: PayloadCriarFuncionario): Promise<ResultadoApi<null>> {
  const resposta = await fetch("/api/funcionarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao cadastrar funcionario" };
  }

  return { ok: true, dados: null };
}

export async function editarFuncionario(id: string, dados: {
  nome: string;
  email: string;
  cargo: string;
  id_pdv: string;
}): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/funcionarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao salvar alteracoes." };
  }

  return { ok: true, dados: null };
}

export async function inativarFuncionario(
  id: string,
  dados: { id_funcionario_destino: string; observacao?: string },
): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/funcionarios/${id}/inativar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao inativar funcionario." };
  }

  return { ok: true, dados: null };
}

type PayloadAcaoLote = {
  ids: string[];
  acao: AcaoLote;
  cargo?: string;
  id_pdv?: string;
  id_funcionario_destino?: string;
  observacao?: string;
};

export async function executarAcaoLoteEquipe(payload: PayloadAcaoLote): Promise<ResultadoApi<ResultadoLote>> {
  const resposta = await fetch("/api/funcionarios", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<ResultadoLote & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao executar acao em lote." };
  }

  return { ok: true, dados: json };
}
