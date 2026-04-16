import { TipoPendencia } from "@/lib/validacoes";
import type { PendenciaGravidade, ResumoPendencias } from "./hooks/use-pendencias-globais";

export type { ResumoPendencias, PendenciaGravidade };

export type Estagio = {
  id: string;
  nome: string;
  ordem: number;
  tipo: string;
};

export type Pdv = {
  id: string;
  nome: string;
};

export type OrigemLead = "MANUAL" | "SINCRONIZACAO_WHATSAPP" | "ANUNCIO_CTWA";

export type Lead = {
  id: string;
  id_estagio: string;
  id_funcionario: string;
  nome: string;
  telefone: string;
  valor_consorcio: number;
  observacoes: string | null;
  motivo_perda: string | null;
  documento_aprovacao_url: string | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  origem?: OrigemLead;
  atualizado_em: string;
  quantidade_parcelas?: number;
  id_pdv?: string | null;
  pdv?: Pdv | null;
  gestores?: Array<{ nome: string }> | null;
  // Campos de Anúncio (CTWA)
  anuncio_titulo?: string | null;
  anuncio_descricao?: string | null;
  announcement_url?: string | null;
};

export type Funcionario = {
  id: string;
  nome: string;
};

export type PendenciaDinamica = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

export type PendenciaLeadInfo = {
  total: number;
  naoResolvidas: number;
  tipos: TipoPendencia[];
  gravidadeMaxima: PendenciaGravidade;
};

export type FiltroPendencia = "todos" | "com_pendencia" | "sem_pendencia";
export type FiltroGravidade = "todas" | "critica" | "alerta" | "info";
export type FiltroTipo = "todos" | TipoPendencia;

export type FiltroOrigem = "todos" | "ANUNCIO_CTWA" | "SINCRONIZACAO_WHATSAPP" | "MANUAL";

export type OrigemStats = {
  total: number;
  anuncios: number;
  whatsapp: number;
  manual: number;
};

export type ResumoOperacionalKanban = {
  leadsSemResponsavel: number;
  leadsParados: number;
  valorTotalEmAberto: number;
};

export type ResumoEstagioKanban = {
  quantidade: number;
  valorTotal: number;
  parados: number;
  pendencias: number;
};

export type KanbanFilters = {
  status: FiltroPendencia;
  gravidade: FiltroGravidade;
  tipo: FiltroTipo;
  pdv: string | null;
  origem: FiltroOrigem;
};

export type OrdenacaoKanban = "valor_maior" | "valor_menor" | "recente" | "antigo" | "nome";

export type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export type StatusSalvamentoDetalhesLead =
  | "ocioso"
  | "pendente"
  | "salvando_manual"
  | "salvando_automaticamente"
  | "uploadando"
  | "salvo"
  | "erro";

export type UseKanbanModuleReturn = {
  estagios: Estagio[];
  leads: Lead[];
  funcionarios: Funcionario[];
  pdvs: Pdv[];
  leadsPorEstagio: Record<string, Lead[]>;
  leadsFiltradosPorEstagio: Record<string, Lead[]>;
  pendenciasPorLead: Record<string, PendenciaLeadInfo>;
  todasPendencias: PendenciaDinamica[];
  resumoPendencias: ResumoPendencias | null;
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaDinamica[];
  dialogNovoLeadAberto: boolean;
  setDialogNovoLeadAberto: (aberto: boolean) => void;
  movimentoPendente: { id_lead: string; id_estagio: string } | null;
  setMovimentoPendente: (movimento: { id_lead: string; id_estagio: string } | null) => void;
  motivoPerda: string;
  setMotivoPerda: (motivo: string) => void;
  telefoneNovoLead: string;
  setTelefoneNovoLead: (telefone: string) => void;
  valorNovoLead: string;
  setValorNovoLead: (valor: string) => void;
  erroNovoLead: string | null;
  setErroNovoLead: (erro: string | null) => void;
  criandoLead: boolean;
  cargoNovoLead: { id_funcionario: string } | null;
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  salvo: boolean;
  salvandoAutomaticamente: boolean;
  salvamentoAutomaticoPendente: boolean;
  ultimaAtualizacaoSalvaEm: Date | null;
  statusSalvamentoDetalhes: StatusSalvamentoDetalhesLead;
  erroDetalhesLead: string | null;
  setErroDetalhesLead: (erro: string | null) => void;
  salvarDetalhesLead: (
    lead: Lead,
    urlDocumento?: string,
    opcoes?: { atualizarSelecionado?: boolean; arquivoUpload?: File | null; dataVenda?: string }
  ) => Promise<void>;
  removerDocumento: () => Promise<void>;
  setLeadSelecionado: (lead: Lead | null) => void;
  criarLead: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  sincronizandoWhatsapp: boolean;
  ultimaSincronizacaoWhatsapp: Date | null;
  instanciasAtivasCount: number;
  redistribuindoEmAtendimento: boolean;
  sincronizarWhatsapp: (params?: string) => Promise<{
    ok: boolean;
    erro?: string;
    criados?: number;
    instanciasIgnoradas?: Array<{ id: string; nome: string; motivo: string }>;
  }>;
  redistribuirLeadsEmAtendimento: () => Promise<
    | { ok: false; erro: string }
    | {
        ok: true;
        avaliados: number;
        elegiveis: number;
        reatribuidos: number;
        ignoradosSemDestino: number;
      }
  >;
  confirmarPerda: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  aoDragEnd: (resultado: import("@hello-pangea/dnd").DropResult) => Promise<void>;
  aoMudarLead: (leadAtualizado: Lead) => void;
  excluirLead: (id: string) => Promise<void>;
  excluirTodosIndefinidos: () => Promise<void>;
  estagioAberto: string;
  setCargoNovoLead: (cargo: { id_funcionario: string } | null) => void;
  setEstagioNovoLead: (estagio: string) => void;
  estagioNovoLead: string;
  filtros: KanbanFilters;
  setFiltros: (filtros: KanbanFilters) => void;
  busca: string;
  setBusca: (busca: string) => void;
  ordenacao: OrdenacaoKanban;
  setOrdenacao: (ordenacao: OrdenacaoKanban) => void;
  modoFocoPendencias: boolean;
  setModoFocoPendencias: (ativo: boolean) => void;
  recarregarPendencias: () => void;
  totalLeads: number;
  pendenciasCriticas: number;
  origemStats: OrigemStats;
  resumoOperacional: ResumoOperacionalKanban;
  resumoPorEstagio: Record<string, ResumoEstagioKanban>;
  notificacoesAtivadas: boolean;
  alternarNotificacoes: () => Promise<boolean>;
  permissaoNotificacao: () => NotificationPermission | "unknown";
};
