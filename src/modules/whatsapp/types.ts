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
  etapas?: Array<{
    ordem: number;
    delay_minutos: number;
    mensagem_template: string;
  }>;
  ativo?: boolean;
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
};

export type UseWhatsappAutomationsReturn = {
  automacoes: WhatsappAutomacao[];
  carregando: boolean;
  erro: string | null;
  criarAutomacao: (data: WhatsappAutomacaoCreateInput) => Promise<void>;
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
