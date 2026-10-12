import type { Parcela, StatusParcela } from "@/lib/api/parcelas";
import { ROTULOS_STATUS } from "@/lib/financeiro/vocabulario";
import type {
  ClienteCarteira,
  RecebimentosResposta,
  RecebimentosResumo,
} from "@/lib/api/recebimentos";

export type StatusRecebimento = StatusParcela;

// Fonte única de rótulos, cores e badges: o vocabulário financeiro.
// Nenhum componente define rótulo de status próprio.
export const STATUS_RECEBIMENTO = Object.fromEntries(
  (Object.keys(ROTULOS_STATUS) as StatusRecebimento[]).map((status) => [
    status,
    {
      rotulo: ROTULOS_STATUS[status].rotulo,
      badge: ROTULOS_STATUS[status].classeBadge,
      cor: ROTULOS_STATUS[status].cor,
    },
  ]),
) as Record<StatusRecebimento, { rotulo: string; badge: string; cor: string }>;

export function isStatusPerdido(status: StatusRecebimento) {
  return status === "CANCELADA" || status === "ABORTADA";
}

// Chip de estado da carteira: o estado agregado do cliente, não da parcela.
export type ChipCarteira = "em_atraso" | "em_dia" | "todos";

export type RecebimentosFiltroForm = {
  busca: string;
  data_inicial: string;
  data_final: string;
  id_pdv: string;
  id_funcionario: string;
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
  atualizando: boolean;
  erro: string | null;
  carteira: ClienteCarteira[];
  carteiraFiltrada: ClienteCarteira[];
  contadoresChips: Record<ChipCarteira, number>;
  chip: ChipCarteira;
  setChip: (chip: ChipCarteira) => void;
  resumo: RecebimentosResumo | null;
  graficos: RecebimentosResposta["graficos"];
  churn: ChurnRecebimentos;
  kpis: RecebimentosKpi[];
  filtros: RecebimentosFiltroForm;
  buscaDigitada: string;
  setBusca: (valor: string) => void;
  temFiltrosAtivos: boolean;
  limparFiltros: () => void;
  setDataInicial: (valor: string) => void;
  setDataFinal: (valor: string) => void;
  setIdPdv: (valor: string) => void;
  setIdFuncionario: (valor: string) => void;
  opcoesPdvs: Array<{ id: string; nome: string }>;
  opcoesResponsaveis: Array<{ id: string; nome: string }>;
  clienteExpandido: string | null;
  parcelasExpandidas: Record<string, Parcela[]>;
  expandindo: string | null;
  alternarExpansao: (idLead: string) => void;
  carregarParcelasCliente: (idLead: string) => Promise<void>;
  salvarObservacao: (idParcela: string, idLead: string, observacao: string | null) => Promise<boolean>;
  pagando: string | null;
  pagarParcela: (idParcela: string, idLead: string, dataPagamento?: string) => Promise<void>;
};

export type { ClienteCarteira };
