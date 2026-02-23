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
