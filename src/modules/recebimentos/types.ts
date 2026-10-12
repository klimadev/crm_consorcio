import type { StatusParcela } from "@/lib/api/parcelas";
import type {
  AbaRecebimentos,
  DirecaoOrdenacao,
  OrdenacaoRecebimentos,
  RecebimentoItem,
  RecebimentosResposta,
  RecebimentosResumo,
} from "@/lib/api/recebimentos";

export type StatusRecebimento = StatusParcela;

export const STATUS_RECEBIMENTO: Record<StatusRecebimento, { rotulo: string; badge: string; cor: string }> = {
  AGUARDANDO: { rotulo: "A vencer", badge: "border-info/25 bg-info/10 text-info", cor: "#3b82f6" },
  ATRASADA: { rotulo: "Atrasada", badge: "border-destructive/20 bg-destructive/10 text-destructive", cor: "#f43f5e" },
  PAGA: { rotulo: "Recebida", badge: "border-success/25 bg-success/10 text-success", cor: "#10b981" },
  CANCELADA: { rotulo: "Cancelada", badge: "border-amber-500/30 bg-amber-500/10 text-amber-600", cor: "#f59e0b" },
  ABORTADA: { rotulo: "Abortada", badge: "border-slate-400/30 bg-slate-400/10 text-slate-500 line-through", cor: "#94a3b8" },
};

export function isStatusPerdido(status: StatusRecebimento) {
  return status === "CANCELADA" || status === "ABORTADA";
}

export type RecebimentosFiltroForm = {
  aba: AbaRecebimentos;
  busca: string;
  data_inicial: string;
  data_final: string;
  id_pdv: string;
  id_funcionario: string;
  ordenar: OrdenacaoRecebimentos;
  direcao: DirecaoOrdenacao;
};

export type RecebimentosKpi = {
  id: string;
  rotulo: string;
  valor: string;
  apoio: string;
  tom: "emerald" | "blue" | "rose" | "amber";
  tendencia?: string;
};

export type ChurnRecebimentos = Pick<
  RecebimentosResumo,
  "totalPerdidoChurn" | "quantidadePerdidas" | "taxaRetencaoParcelas" | "churnPorParcela"
>;

export type UseRecebimentosModuleReturn = {
  carregando: boolean;
  erro: string | null;
  recebimentos: RecebimentoItem[];
  resumo: RecebimentosResumo | null;
  graficos: RecebimentosResposta["graficos"];
  churn: ChurnRecebimentos;
  contadoresAbas: Record<AbaRecebimentos, number>;
  filtros: RecebimentosFiltroForm;
  pagina: number;
  limite: number;
  totalPaginas: number;
  totalRegistros: number;
  opcoesPdvs: Array<{ id: string; nome: string }>;
  opcoesResponsaveis: Array<{ id: string; nome: string }>;
  kpis: RecebimentosKpi[];
  temFiltrosAtivos: boolean;
  setBusca: (valor: string) => void;
  setAba: (aba: AbaRecebimentos) => void;
  setDataInicial: (valor: string) => void;
  setDataFinal: (valor: string) => void;
  setIdPdv: (valor: string) => void;
  setIdFuncionario: (valor: string) => void;
  setOrdenar: (valor: OrdenacaoRecebimentos) => void;
  setDirecao: (valor: DirecaoOrdenacao) => void;
  limparFiltros: () => void;
  irParaPagina: (pagina: number) => void;
  recarregar: () => Promise<void>;
  pagando: string | null;
  pagarParcela: (idParcela: string, dataPagamento?: string) => Promise<void>;
  deletando: string | null;
  deletarParcela: (idParcela: string) => Promise<void>;
};
