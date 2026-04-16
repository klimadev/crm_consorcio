type ApiErro = { erro?: string };

type ResultadoApi<T> = { ok: true; dados: T } | { ok: false; erro: string };

export type ResumoKpi = {
  id: string;
  rotulo: string;
  valor: string;
  apoio: string;
  tom: "emerald" | "blue" | "rose" | "amber";
  tendencia?: string;
};

export type ResumoSerieMensal = { label: string; ganhos: number; perdidos: number; abertos: number };

export type ResumoSerieSemanal = {
  label: string;
  cotas: number;
  volume: number;
  metaCotas: number;
  metaVolume: number;
  bateuMetaCotas: boolean;
  bateuMetaVolume: boolean;
};

export type ResumoPeriodoFiltro = "todo" | "mensal" | "semanal";

export type ResumoPeriodoFaixa = {
  tipo: ResumoPeriodoFiltro;
  inicio: string;
  fim: string;
};

export type ResumoParticipacaoAtendente = {
  funcionarioId: string;
  nome: string;
  email: string;
  quantidade: number;
  valor: number;
  percentual: number;
};

export type ResumoRankingAtendente = {
  funcionarioId: string;
  nome: string;
  email: string;
  quantidadeNegocios: number;
  ticketMedio: number;
  valorTotal: number;
};

export type ResumoPendenciaItem = {
  tipo: string;
  quantidade: number;
  descricao: string;
};

export type ResumoResposta = {
  resumo: {
    totalNegocios: number;
    totalGanhosValor: number;
    totalGanhosQuantidade: number;
    totalPerdidosValor: number;
    totalPerdidosQuantidade: number;
    totalEmAbertoValor: number;
    totalEmAbertoQuantidade: number;
  };
  variacoes: {
    negocios: number;
    ganhos: number;
    perdidos: number;
    aberto: number;
  };
  graficos: {
    evolucaoMensal: ResumoSerieMensal[];
    evolucaoSemanal: ResumoSerieSemanal[];
    participacaoAtendentes: ResumoParticipacaoAtendente[];
  };
  rankings: {
    atendentes: ResumoRankingAtendente[];
  };
  operacao: {
    pendencias: {
      total: number;
      criticas: number;
      alertas: number;
      leadsImpactados: number;
      itens: ResumoPendenciaItem[];
    };
  };
  meta: {
    perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
    visaoEquipe: boolean;
    visaoIndividual: boolean;
  };
  filtro: {
    periodo: ResumoPeriodoFaixa;
  };
};

type FiltrosResumo = {
  periodo?: ResumoPeriodoFiltro;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function buscarResumo(filtros: FiltrosResumo = {}): Promise<ResultadoApi<ResumoResposta>> {
  const searchParams = new URLSearchParams();
  if (filtros.periodo) {
    searchParams.set("periodo", filtros.periodo);
  }
  const query = searchParams.toString();
  const resposta = await fetch(`/api/resumo${query ? `?${query}` : ""}`, { cache: "no-store" });
  const json = await lerJsonSeguro<ResumoResposta & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar o resumo." };
  }

  return { ok: true, dados: json };
}
