import type { OrigemResultadoMeta, Perfil, PeriodoMeta, TipoMetaValor } from "@/lib/tipos";

export type MetaMedicao = "VALOR_PAGAMENTOS" | "VALOR_FECHADOS" | "VOLUME_FECHADOS";

export type MetaModuleProgresso = {
  id_meta: string;
  periodo: string;
  realizado: number;
  meta: number;
  percentual: number;
  dias_restantes: number;
  faltante: number;
};

export type MetaModuleItem = {
  id: string;
  titulo: string;
  tipo: "PDV";
  tipo_meta: TipoMetaValor;
  origem_resultado: OrigemResultadoMeta;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  id_pdv: string | null;
  id_funcionario: null;
  pdv: { id: string; nome: string } | null;
  funcionario: null;
  progresso?: MetaModuleProgresso | null;
  template?: null;
  periodo_item?: {
    semana_do_mes: 1 | 2 | 3 | 4 | null;
    periodo_label: string;
  } | null;
};

export type RankingMetaModuleItem = {
  id: string;
  nome: string;
  percentual: number;
  posicao: number;
  realizado: number;
  meta: number;
  faltante: number;
};

export type MetaFormState = {
  titulo: string;
  periodo: PeriodoMeta;
  medicao: MetaMedicao;
  alvo: string;
  data_inicio: string;
  data_fim: string;
  id_pdv: string;
};

export type MetaOptionPdv = {
  id: string;
  nome: string;
};

export type UseMetasModuleProps = {
  perfil: Perfil;
  id_pdv?: string | null;
  modo: "painel";
};

export type ResumoMetasSemana = {
  totalEquipes: number;
  equipesNoRitmo: number;
  equipesEmAtencao: number;
  equipesForaDoRitmo: number;
  mediaPercentual: number;
};

export type UseMetasModuleReturn = {
  modo: "painel";
  perfil: Perfil;
  metas: MetaModuleItem[];
  metasFiltradas: MetaModuleItem[];
  metasAgrupadas: Array<{ id: string; nome: string; metas: MetaModuleItem[] }>;
  ranking: RankingMetaModuleItem[];
  mediaEquipe: number;
  totalParticipantes: number;
  opcoesPdvs: MetaOptionPdv[];
  carregando: boolean;
  salvando: boolean;
  desativandoId: string | null;
  erro: string | null;
  dialogFormAberto: boolean;
  metaEmEdicao: MetaModuleItem | null;
  pdvSelecionado: string | null;
  podeCriarMeta: boolean;
  resumo: ResumoMetasSemana;
  setPdvSelecionado: (id: string | null) => void;
  abrirNovaMeta: () => void;
  abrirEdicao: (meta: MetaModuleItem) => void;
  fecharDialog: () => void;
  salvarMeta: (formulario: MetaFormState) => Promise<boolean>;
  desativarMeta: (id: string) => Promise<boolean>;
  recarregar: () => Promise<void>;
};
