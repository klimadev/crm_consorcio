import type { Perfil, PeriodoMeta, TipoMeta, TipoMetaValor } from "@/lib/tipos";

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
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  id_pdv: string | null;
  id_funcionario: string | null;
  pdv: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string; id_pdv?: string | null } | null;
  progresso?: MetaModuleProgresso | null;
};

export type RankingMetaModuleItem = {
  id: string;
  nome: string;
  percentual: number;
  posicao: number;
};

export type TetoMetaModuleResumo = {
  id_meta: string;
  tipo_meta: TipoMetaValor;
  alvo: number;
  alocado: number;
  disponivel: number;
  pdv?: { id: string; nome: string } | null;
};

export type MetaFormState = {
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: string;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  id_pdv: string;
  id_funcionario: string;
};

export type MetaOptionPdv = {
  id: string;
  nome: string;
};

export type MetaOptionColaborador = {
  id: string;
  nome: string;
  id_pdv: string;
  nome_pdv: string;
};

export type UseMetasModuleProps = {
  perfil: Perfil;
  id_pdv?: string | null;
  id_usuario: string;
  modo: "painel" | "colaborador";
};

export type UseMetasModuleReturn = {
  modo: "painel" | "colaborador";
  metas: MetaModuleItem[];
  metasGlobais: MetaModuleItem[];
  metasPdv: MetaModuleItem[];
  metasIndividuais: MetaModuleItem[];
  minhaMeta: MetaModuleItem | null;
  progresso: MetaModuleProgresso | null;
  ranking: RankingMetaModuleItem[];
  mediaEquipe: number;
  totalParticipantes: number;
  tetos: {
    globais: TetoMetaModuleResumo[];
    pdvs: TetoMetaModuleResumo[];
  };
  opcoesPdvs: MetaOptionPdv[];
  opcoesColaboradores: MetaOptionColaborador[];
  carregando: boolean;
  salvando: boolean;
  desativandoId: string | null;
  erro: string | null;
  dialogFormAberto: boolean;
  metaEmEdicao: MetaModuleItem | null;
  tipoCriacao: TipoMeta;
  abaAtiva: TipoMeta;
  podeCriarGlobal: boolean;
  podeCriarMetaPdv: boolean;
  podeCriarMetaIndividual: boolean;
  podeVerValoresAbsolutos: boolean;
  setAbaAtiva: (aba: TipoMeta) => void;
  abrirNovaMeta: (tipo?: TipoMeta) => void;
  abrirEdicao: (meta: MetaModuleItem) => void;
  fecharDialog: () => void;
  salvarMeta: (formulario: MetaFormState) => Promise<boolean>;
  desativarMeta: (id: string) => Promise<boolean>;
  recarregar: () => Promise<void>;
};
