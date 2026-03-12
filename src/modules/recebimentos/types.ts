import type {
  AbaRecebimentos,
  DirecaoOrdenacao,
  OrdenacaoRecebimentos,
  RecebimentoItem,
  RecebimentosResposta,
  RecebimentosResumo,
} from "@/lib/api/recebimentos";

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

export type UseRecebimentosModuleReturn = {
  carregando: boolean;
  erro: string | null;
  recebimentos: RecebimentoItem[];
  resumo: RecebimentosResumo | null;
  graficos: RecebimentosResposta["graficos"];
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
};
