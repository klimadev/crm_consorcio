export type ConnectionQuality = "excellent" | "good" | "unstable" | "offline" | "unknown";
export type ConnectionDataSource = "evolution_live" | "db_cache" | "unavailable";

export type WhatsappInstancia = {
  id: string;
  id_empresa: string;
  id_criador: string;
  nome: string;
  instance_name: string;
  status: string;
  phone: string | null;
  profile_name: string | null;
  profile_pic: string | null;
  criado_em: Date;
  atualizado_em: Date;
  // Novos campos para Cockpit
  latency_ms: number | null;
  last_seen_at: string | null;
  connection_quality: ConnectionQuality;
  data_source: ConnectionDataSource;
};

export type UseWhatsappModuleReturn = {
  instancias: WhatsappInstancia[];
  carregando: boolean;
  erro: string | null;
  criarInstancia: (nome: string) => Promise<void>;
  excluirInstancia: (id: string) => Promise<void>;
  atualizarStatus: (id: string) => Promise<void>;
  buscarQrCode: (id: string) => Promise<string | null>;
  getQrCode: (id: string) => string | null;
  recarregar: () => Promise<void>;
};

export type StatusAutomacao = "ATIVA" | "INATIVA" | "ERRO_CONFIG" | "ERRO_JOB";
export type StatusJob = "SCHEDULED" | "NOT_SCHEDULED" | "DELETED" | "FAILED";

export type WhatsappAutomacao = {
  id: string;
  id_empresa: string;
  id_whatsapp_instancia: string;
  evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
  id_estagio_destino: string | null;
  tipo_destino: "FIXO" | "LEAD_TELEFONE";
  telefone_destino: string | null;
  mensagem: string | null;
  ativo: boolean;
  // Novos campos para horário flexível e rastreamento
  horario_raw: string | null;
  horario_normalizado: string | null;
  delay_minutos: number | null;
  timezone: string;
  status: StatusAutomacao;
  job_id: string | null;
  job_status: StatusJob | null;
  ultima_sincronizacao_job_em: Date | null;
  ultima_execucao_em: Date | null;
  proxima_execucao_em: Date | null;
  deleted_at: Date | null;
  etapas?: WhatsappAutomacaoEtapa[];
  criado_em: Date;
  atualizado_em: Date;
};

export type WhatsappAutomacaoEtapa = {
  id: string;
  id_empresa: string;
  id_whatsapp_automacao: string;
  ordem: number;
  delay_minutos: number;
  mensagem_template: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type WhatsappAutomacaoCreateInput = {
  id_whatsapp_instancia: string;
  evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
  id_estagio_destino?: string;
  tipo_destino: "FIXO" | "LEAD_TELEFONE";
  telefone_destino?: string;
  mensagem?: string;
  horario_texto?: string; // Horário textual flexível: "9h", "09:30", etc.
  etapas?: Array<{
    ordem: number;
    delay_minutos: number;
    mensagem_template: string;
  }>;
  ativo?: boolean;
};

export type WhatsappAutomacaoUpdateInput = {
  id_whatsapp_instancia?: string;
  evento?: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
  id_estagio_destino?: string | null;
  tipo_destino?: "FIXO" | "LEAD_TELEFONE";
  telefone_destino?: string | null;
  mensagem?: string | null;
  horario_texto?: string; // Horário textual flexível
  ativo?: boolean;
  etapas?: Array<{
    ordem: number;
    delay_minutos: number;
    mensagem_template: string;
  }>;
};

export type WhatsappFollowUpDispatchDetalhe = {
  agendamentoId: string;
  automacaoId: string;
  etapaId: string;
  leadId: string;
  tentativa: number;
  statusFinal: "ENVIADO" | "PENDENTE" | "FALHA" | "CANCELADO";
  telefoneE164: string | null;
  erro: string | null;
};

export type WhatsappFollowUpDispatchResultado = {
  runId: string;
  processados: number;
  enviados: number;
  falhas: number;
  detalhes: WhatsappFollowUpDispatchDetalhe[];
  metrics?: {
    jobsClaimed: number;
    jobsSkippedAlreadyClaimed: number;
    jobsDuplicateBlocked: number;
    jobsProcessed: number;
    jobsEnviados: number;
    jobsFalhas: number;
  };
};

export type UseWhatsappAutomationsReturn = {
  automacoes: WhatsappAutomacao[];
  carregando: boolean;
  erro: string | null;
  criarAutomacao: (data: WhatsappAutomacaoCreateInput) => Promise<void>;
  atualizarAutomacao: (id: string, data: WhatsappAutomacaoUpdateInput) => Promise<void>;
  previewMensagem: (mensagem: string) => Promise<string | null>;
  dispararDispatchFollowUp: (limite?: number) => Promise<WhatsappFollowUpDispatchResultado | null>;
  alternarAutomacao: (id: string, ativo: boolean) => Promise<void>;
  excluirAutomacao: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
};

export type EstagioFunilOption = {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
};

export type WhatsappJobsResumo = {
  pendentes: number;
  processando: number;
  falhas: number;
  enviadosHoje: number;
  atualizadoEm: string;
};

export type JobErrorCategory = "VALIDACAO" | "REDE" | "AUTENTICACAO" | "RATE_LIMIT" | "DESCONHECIDO" | null;

export type WhatsappJobItem = {
  id: string;
  id_lead: string;
  id_etapa: string;
  id_estagio_trigger: string | null;
  mensagem_template: string;
  contexto_json: string;
  agendado_para: string;
  status: string;
  tentativas: number;
  erro_ultimo: string | null;
  // Novos campos para UX avançada
  erro_codigo: string | null;
  erro_categoria: JobErrorCategory;
  erro_detalhe: string | null;
  acao_recomendada: string | null;
  tentativas_max: number;
  progress_pct: number | null;
  enviado_em: string | null;
  criado_em: string;
};

export type UseWhatsappJobsReturn = {
  resumo: WhatsappJobsResumo;
  jobs: WhatsappJobItem[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
};
