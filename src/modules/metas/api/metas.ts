import type { Meta, MetaFormData, RankingItem } from "@/modules/metas/types";

type ApiErro = { erro?: string };
type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

/** Lista metas com filtros opcionais */
export async function listarMetas(filtros?: {
  id_equipe?: string;
  mes_referencia?: string;
  ativo?: boolean;
}): Promise<ResultadoApi<{ metas: Meta[] }>> {
  const params = new URLSearchParams();
  if (filtros?.id_equipe) params.set("id_equipe", filtros.id_equipe);
  if (filtros?.mes_referencia) params.set("mes_referencia", filtros.mes_referencia);
  if (filtros?.ativo !== undefined) params.set("ativo", String(filtros.ativo));
  const query = params.toString();
  const sufixo = query ? `?${query}` : "";

  const resposta = await fetch(`/api/metas${sufixo}`, { cache: "no-store" });
  const json = await lerJsonSeguro<{ metas?: Meta[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar metas." };
  }
  return { ok: true, dados: { metas: json.metas ?? [] } };
}

/** Cria uma nova meta em 1 chamada */
export async function criarMeta(dados: MetaFormData): Promise<ResultadoApi<{ meta: Meta }>> {
  const resposta = await fetch("/api/metas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const json = await lerJsonSeguro<{ meta?: Meta } & ApiErro>(resposta);

  if (!resposta.ok || !json.meta) {
    return { ok: false, erro: json.erro ?? "Erro ao criar meta." };
  }
  return { ok: true, dados: { meta: json.meta } };
}

/** Edita campos parciais de uma meta */
export async function editarMeta(
  id: string,
  dados: Partial<MetaFormData>,
): Promise<ResultadoApi<{ meta: Meta }>> {
  const resposta = await fetch(`/api/metas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const json = await lerJsonSeguro<{ meta?: Meta } & ApiErro>(resposta);

  if (!resposta.ok || !json.meta) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar meta." };
  }
  return { ok: true, dados: { meta: json.meta } };
}

/** Desativa (soft delete) uma meta */
export async function desativarMeta(id: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/metas/${id}`, { method: "DELETE" });
  const json = await lerJsonSeguro<ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao desativar meta." };
  }
  return { ok: true, dados: null };
}

/** Obtém ranking de equipes */
export async function obterRanking(filtros?: {
  mes_referencia?: string;
  id_equipe?: string;
}): Promise<ResultadoApi<{ ranking: RankingItem[]; media_geral: number; total_participantes: number }>> {
  const params = new URLSearchParams();
  if (filtros?.mes_referencia) params.set("mes_referencia", filtros.mes_referencia);
  if (filtros?.id_equipe) params.set("id_equipe", filtros.id_equipe);
  const query = params.toString();
  const sufixo = query ? `?${query}` : "";

  const resposta = await fetch(`/api/metas/ranking${sufixo}`, { cache: "no-store" });
  const json = await lerJsonSeguro<{
    ranking?: RankingItem[];
    media_geral?: number;
    total_participantes?: number;
  } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar ranking." };
  }
  return {
    ok: true,
    dados: {
      ranking: json.ranking ?? [],
      media_geral: json.media_geral ?? 0,
      total_participantes: json.total_participantes ?? 0,
    },
  };
}
