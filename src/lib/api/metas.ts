import type {
  MetaMedicao,
  MetaModuleItem,
  MetaModuleProgresso,
  RankingMetaModuleItem,
} from "@/modules/equipe/types/metas";
import type { OrigemResultadoMeta, PeriodoMeta, TipoMetaValor } from "@/lib/tipos";

type ApiErro = { erro?: string };

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export type MetaPayloadApi = {
  titulo: string;
  tipo: "PDV";
  tipo_meta: TipoMetaValor;
  origem_resultado: OrigemResultadoMeta;
  cadencia: "SEMANAL_MES" | "MENSAL" | "TRIMESTRAL" | "ANUAL" | "PERSONALIZADO";
  recorrencia: "PONTUAL";
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  id_pdv: string;
};

export const MEDICOES_META: Array<{ value: MetaMedicao; label: string }> = [
  { value: "VALOR_PAGAMENTOS", label: "Valor - pagamentos" },
  { value: "VALOR_FECHADOS", label: "Valor - fechados" },
  { value: "VOLUME_FECHADOS", label: "Volume - fechados" },
];

export async function listarMetas(queryString = ""): Promise<ResultadoApi<{ metas: MetaModuleItem[] }>> {
  const sufixo = queryString ? `?${queryString}` : "";
  const resposta = await fetch(`/api/metas${sufixo}`, { cache: "no-store" });
  const json = await lerJsonSeguro<{ metas?: MetaModuleItem[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar metas." };
  }

  return {
    ok: true,
    dados: {
      metas: json.metas ?? [],
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
    return { ok: false, erro: json.erro ?? "Erro ao carregar comparativo das equipes." };
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
