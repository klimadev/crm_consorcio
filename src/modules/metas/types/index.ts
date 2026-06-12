/** Status de ritmo baseado no percentual de progresso */
export type RitmoStatus = "no_ritmo" | "atencao" | "fora";

/** Meta unificada (corresponde à tabela MetaNova) */
export interface Meta {
  id: string;
  id_empresa: string;
  titulo: string;
  tipo_meta: "VALOR" | "VOLUME";
  origem: "PAGAMENTOS" | "FECHADOS";
  alvo: number;
  semana: number; // 1-4
  mes_referencia: string; // "YYYY-MM"
  data_inicio: string; // ISO
  data_fim: string; // ISO
  ativo: boolean;
  id_equipe: string;
  criado_em: string;
  atualizado_em: string;
  equipe?: { id: string; nome: string } | null;
  progresso?: ProgressoMeta | null;
}

/** Progresso calculado de uma meta (gerado pelo calculator.ts) */
export interface ProgressoMeta {
  id_meta: string;
  realizado: number;
  percentual: number;
  faltante: number;
  dias_restantes: number;
  status: RitmoStatus;
}

/** Dados do formulário de criação/edição de meta (2-step wizard) */
export interface MetaFormData {
  id_equipe: string;
  tipo_meta: "VALOR" | "VOLUME";
  origem: "PAGAMENTOS" | "FECHADOS";
  alvo: number;
  semana: number;
  mes_referencia: string;
}

/** Item do ranking (1 por equipe) */
export interface RankingItem {
  posicao: number;
  id_equipe: string;
  nome: string;
  percentual: number;
  realizado: number;
  alvo: number;
  faltante: number;
}

/** Resumo agregado de metas */
export interface ResumoMetas {
  total_equipes: number;
  no_ritmo: number;
  atencao: number;
  fora: number;
  media_percentual: number;
}

/** Resposta da API GET /api/metas */
export interface ListarMetasResponse {
  metas: Meta[];
}

/** Item de proporção por equipe (para barra empilhada) */
export interface ProporcaoItem {
  id_equipe: string;
  nome: string;
  percentual: number;
  cor: string;
}

/** Dados de comparação entre dois períodos */
export interface ComparacaoPeriodo {
  mes_referencia: string;
  ranking: RankingItem[];
  media_geral: number;
  total_participantes: number;
}

/** Dados de comparação com delta */
export interface ComparacaoItem extends RankingItem {
  delta_percentual: number | null;
}

/** Período disponível para seleção */
export interface PeriodoDisponivel {
  mes: string; // "YYYY-MM"
  label: string; // "Jun/2026"
}

/** Resposta da API GET /api/metas/ranking */
export interface RankingResponse {
  ranking: RankingItem[];
  media_geral: number;
  total_participantes: number;
}

/** Retorno do hook useMetasModule (simplificado) */
export interface UseMetasModuleReturn {
  metas: Meta[];
  metasPorEquipe: Map<string, Meta[]>;
  ranking: RankingItem[];
  rankingComparado: ComparacaoItem[];
  resumo: ResumoMetas;
  mediaGeral: number;
  totalParticipantes: number;
  opcoesEquipes: Array<{ id: string; nome: string }>;
  carregando: boolean;
  salvando: boolean;
  erro: string | null;
  equipeSelecionada: string | null;
  podeCriarMeta: boolean;
  setEquipeSelecionada: (id: string | null) => void;
  abrirNovaMeta: () => void;
  abrirEdicao: (meta: Meta) => void;
  criarMeta: (dados: MetaFormData) => Promise<boolean>;
  editarMeta: (id: string, dados: Partial<MetaFormData>) => Promise<boolean>;
  arquivarMeta: (id: string) => Promise<boolean>;
  recarregar: () => Promise<void>;
  // Estados do wizard
  wizardAberto: boolean;
  metaEmEdicao: Meta | null;
  fecharWizard: () => void;
  // Period filter
  mesReferencia: string;
  periodosDisponiveis: PeriodoDisponivel[];
  setMesReferencia: (mes: string) => void;
  // Comparação períodos
  comparacaoAtiva: boolean;
  setComparacaoAtiva: (ativa: boolean) => void;
  mesComparacao: string;
  setMesComparacao: (mes: string) => void;
  dadosComparacao: ComparacaoPeriodo | null;
  carregandoComparacao: boolean;
  // Proporção por equipe
  proporcaoEquipes: ProporcaoItem[];
}
