type ApiErro = {
  erro?: string;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

// Unidade de trabalho da carteira: um cliente, uma linha, uma verdade.
// Estado derivado das parcelas dele dentro do filtro atual.
export type ClienteCarteira = {
  id_lead: string;
  nome: string;
  telefone: string;
  estado: "em_atraso" | "em_dia" | "pago_no_periodo";
  valorEmRisco: number;
  quantidadeAtrasadas: number;
  quantidadePendentes: number;
  valorPendente: number;
  proximoVencimento: string | null;
  primeiroAtraso: string | null;
  ultimoPagamento: string | null;
  pagasPlano: number;
  totalPlano: number;
};

export type ChurnPorParcela = {
  numero_parcela: number;
  quantidade: number;
  valor: number;
};

export type DistribuicaoStatusItem = {
  status: "AGUARDANDO" | "ATRASADA" | "PAGA" | "CANCELADA" | "ABORTADA";
  quantidade: number;
  valor: number;
};

export type RecebimentosResumo = {
  totalRecebidoPeriodo: number;
  totalEmAberto: number;
  totalAtrasado: number;
  taxaAdimplencia: number;
  quantidadeRecebidas: number;
  quantidadePendentes: number;
  quantidadeAtrasadas: number;
  quantidadeMonitoradas: number;
  parcelasVencendo7Dias: number;
  variacaoRecebidoPeriodo: number;
  totalPerdidoChurn: number;
  quantidadePerdidas: number;
  taxaRetencaoParcelas: number;
  churnPorParcela: ChurnPorParcela[];
  quantidadeAbortadas: number;
  totalAbortado: number;
};

export type RecebimentosResposta = {
  resumo: RecebimentosResumo;
  graficos: {
    recebimentosPorPeriodo: Array<{ label: string; recebido: number; previsto: number }>;
    distribuicaoStatus: DistribuicaoStatusItem[];
  };
  carteira: ClienteCarteira[];
  filtrosAplicados: {
    busca?: string;
    data_inicial?: string;
    data_final?: string;
    id_pdv?: string;
    id_funcionario?: string;
  };
  opcoes: {
    pdvs: Array<{ id: string; nome: string }>;
    responsaveis: Array<{ id: string; nome: string }>;
  };
};

export type FiltrosRecebimentos = {
  busca?: string;
  data_inicial?: string;
  data_final?: string;
  id_pdv?: string;
  id_funcionario?: string;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarRecebimentos(filtros: FiltrosRecebimentos): Promise<ResultadoApi<RecebimentosResposta>> {
  const searchParams = new URLSearchParams();

  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    searchParams.set(chave, String(valor));
  }

  const resposta = await fetch(`/api/recebimentos?${searchParams.toString()}`);
  const json = await lerJsonSeguro<RecebimentosResposta & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar painel de recebimentos." };
  }

  return { ok: true, dados: json };
}
