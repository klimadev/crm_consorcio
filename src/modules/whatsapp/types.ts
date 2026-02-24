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
  evento: string;
  id_estagio_destino: string | null;
  telefone_destino: string;
  mensagem: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type UseWhatsappAutomationsReturn = {
  automacoes: WhatsappAutomacao[];
  carregando: boolean;
  erro: string | null;
  criarAutomacao: (data: {
    id_whatsapp_instancia: string;
    evento: string;
    id_estagio_destino?: string;
    telefone_destino: string;
    mensagem: string;
    ativo?: boolean;
  }) => Promise<void>;
  alternarAutomacao: (id: string, ativo: boolean) => Promise<void>;
  excluirAutomacao: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
};
