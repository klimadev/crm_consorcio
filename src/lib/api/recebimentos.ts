type ApiErro = {
  erro?: string;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export type AbaRecebimentos = "todos" | "recebidos" | "a_vencer" | "atrasados";
export type OrdenacaoRecebimentos = "vencimento" | "pagamento" | "valor";
export type DirecaoOrdenacao = "asc" | "desc";

export type RecebimentoItem = {
  id: string;
  numero_parcela: number;
  quantidade_total: number;
  valor: number;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
  data_vencimento: string;
  data_pagamento: string | null;
  dias_em_atraso: number;
  lead: {
    id: string;
    nome: string;
    telefone: string;
    valor_consorcio: number;
    estagio: string;
  };
  pdv: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string };
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
};

export type RecebimentosResposta = {
  resumo: RecebimentosResumo;
  graficos: {
    recebimentosPorPeriodo: Array<{ label: string; recebido: number; previsto: number }>;
    distribuicaoStatus: Array<{ status: "PAGO" | "PENDENTE" | "ATRASADO"; quantidade: number; valor: number }>;
  };
  lista: RecebimentoItem[];
  contadoresAbas: Record<AbaRecebimentos, number>;
  filtrosAplicados: {
    aba: AbaRecebimentos;
    busca?: string;
    data_inicial?: string;
    data_final?: string;
    id_pdv?: string;
    id_funcionario?: string;
    ordenar: OrdenacaoRecebimentos;
    direcao: DirecaoOrdenacao;
    pagina: number;
    limite: number;
  };
  opcoes: {
    pdvs: Array<{ id: string; nome: string }>;
    responsaveis: Array<{ id: string; nome: string }>;
  };
  paginacao: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
};

export type FiltrosRecebimentos = {
  aba?: AbaRecebimentos;
  busca?: string;
  data_inicial?: string;
  data_final?: string;
  id_pdv?: string;
  id_funcionario?: string;
  ordenar?: OrdenacaoRecebimentos;
  direcao?: DirecaoOrdenacao;
  pagina?: number;
  limite?: number;
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
