import type {
  MetaModuleItem,
  MetaModuleProgresso,
  RankingMetaModuleItem,
  TetoMetaModuleResumo,
} from "@/modules/equipe/types/metas";

type ApiErro = { erro?: string };

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export type MetaPayloadApi = {
  tipo: "GLOBAL" | "PDV" | "INDIVIDUAL";
  tipo_meta: "VALOR" | "VOLUME";
  alvo: number;
  periodo: "MENSAIS" | "TRIMESTRAL" | "ANUAL";
  data_inicio: string;
  data_fim: string;
  id_pdv?: string;
  id_funcionario?: string;
};

export async function listarMetas(queryString = ""): Promise<ResultadoApi<{
  metas: MetaModuleItem[];
  tetos: {
    globais: TetoMetaModuleResumo[];
    pdvs: TetoMetaModuleResumo[];
  };
}>> {
  const sufixo = queryString ? `?${queryString}` : "";
  const resposta = await fetch(`/api/metas${sufixo}`, { cache: "no-store" });
  const json = await lerJsonSeguro<{
    metas?: MetaModuleItem[];
    tetos?: { globais?: TetoMetaModuleResumo[]; pdvs?: TetoMetaModuleResumo[] };
  } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar metas." };
  }

  return {
    ok: true,
    dados: {
      metas: json.metas ?? [],
      tetos: {
        globais: json.tetos?.globais ?? [],
        pdvs: json.tetos?.pdvs ?? [],
      },
    },
  };
}

export async function criarMeta(payload: MetaPayloadApi): Promise<ResultadoApi<{ meta: MetaModuleItem }>> {
  const resposta = await fetch("/api/metas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<{ meta?: MetaModuleItem } & ApiErro>(resposta);

  if (!resposta.ok || !json.meta) {
    return { ok: false, erro: json.erro ?? "Erro ao criar meta." };
  }

  return { ok: true, dados: { meta: json.meta } };
}

export async function editarMeta(id: string, payload: Partial<MetaPayloadApi>): Promise<ResultadoApi<{ meta: MetaModuleItem }>> {
  const resposta = await fetch(`/api/metas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<{ meta?: MetaModuleItem } & ApiErro>(resposta);

  if (!resposta.ok || !json.meta) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar meta." };
  }

  return { ok: true, dados: { meta: json.meta } };
}

export async function desativarMeta(id: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/metas/${id}`, { method: "DELETE" });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao desativar meta." };
  }

  return { ok: true, dados: null };
}

export async function obterProgressoMeta(id: string): Promise<ResultadoApi<MetaModuleProgresso>> {
  const resposta = await fetch(`/api/metas/${id}/progresso`, { cache: "no-store" });
  const json = await lerJsonSeguro<MetaModuleProgresso & ApiErro>(resposta);

  if (!resposta.ok || !json.id_meta) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar progresso da meta." };
  }

  return { ok: true, dados: json };
}

export async function obterRankingMetas(queryString = ""): Promise<ResultadoApi<{
  ranking: RankingMetaModuleItem[];
  media_equipe: number;
  total_participantes: number;
}>> {
  const sufixo = queryString ? `?${queryString}` : "";
  const resposta = await fetch(`/api/metas/ranking${sufixo}`, { cache: "no-store" });
  const json = await lerJsonSeguro<{
    ranking?: RankingMetaModuleItem[];
    media_equipe?: number;
    total_participantes?: number;
  } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar ranking das metas." };
  }

  return {
    ok: true,
    dados: {
      ranking: json.ranking ?? [],
      media_equipe: json.media_equipe ?? 0,
      total_participantes: json.total_participantes ?? 0,
    },
  };
}

export async function validarTetoMeta(payload: MetaPayloadApi & { id_meta_atual?: string }): Promise<ResultadoApi<{
  teto: {
    tipo: "GLOBAL" | "PDV";
    tipo_meta: "VALOR" | "VOLUME";
    alvo_pai: number;
    alocado: number;
    disponivel: number;
  } | null;
}>> {
  const resposta = await fetch("/api/metas/validar-teto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await lerJsonSeguro<{
    ok?: boolean;
    teto?: {
      tipo: "GLOBAL" | "PDV";
      tipo_meta: "VALOR" | "VOLUME";
      alvo_pai: number;
      alocado: number;
      disponivel: number;
    } | null;
  } & ApiErro>(resposta);

  if (!resposta.ok || json.ok === false) {
    return { ok: false, erro: json.erro ?? "Erro ao validar teto da meta." };
  }

  return { ok: true, dados: { teto: json.teto ?? null } };
}
