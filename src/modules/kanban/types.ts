export type Estagio = {
  id: string;
  nome: string;
  ordem: number;
  tipo: string;
};

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
};

export type Funcionario = {
  id: string;
  nome: string;
};

export type PendenciaLead = {
  id: string;
  id_lead: string;
  tipo: string;
  descricao: string;
  documento_url: string | null;
  resolvida: boolean;
  resolvida_em: string | null;
};

export type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export type UseKanbanModuleReturn = {
  estagios: Estagio[];
  leads: Lead[];
  funcionarios: Funcionario[];
  leadsPorEstagio: Record<string, Lead[]>;
  pendenciasPorLead: Record<string, { total: number; naoResolvidas: number }>;
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaLead[];
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
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  salvo: boolean;
  erroDetalhesLead: string | null;
  setLeadSelecionado: (lead: Lead | null) => void;
  criarLead: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  confirmarPerda: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  aoDragEnd: (resultado: import("@hello-pangea/dnd").DropResult) => Promise<void>;
  aoMudarLead: (leadAtualizado: Lead) => void;
  togglePendenciaResolvida: (pendencia: PendenciaLead) => Promise<void>;
  excluirLead: (id: string) => Promise<void>;
  estagioAberto: string;
  cargoNovoLead: { id_funcionario: string } | null;
  setCargoNovoLead: (cargo: { id_funcionario: string } | null) => void;
  setEstagioNovoLead: (estagio: string) => void;
  estagioNovoLead: string;
};
