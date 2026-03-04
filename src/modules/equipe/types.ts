export type Pdv = {
  id: string;
  nome: string;
  id_whatsapp_instancia?: string | null;
  whatsapp_instancia?: {
    id: string;
    nome: string;
    status: string;
  } | null;
  funcionarios?: Array<{
    id: string;
    nome: string;
    cargo: string;
  }>;
};

export type WhatsappInstanciaResumo = {
  id: string;
  nome: string;
  status: string;
};

export type WhatsappInstanciaEmEdicao = {
  id: string;
  nome: string;
};

export type Funcionario = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  pdv: { id: string; nome: string };
};

export type Paginacao = {
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
};

export type KpisEquipe = {
  total: number;
  ativos: number;
  inativos: number;
  gerentes: number;
  colaboradores: number;
};

export type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
};

export type DadosEdicao = {
  nome: string;
  email: string;
  cargo: string;
  id_pdv: string;
};

export type ErrosEdicao = Partial<Record<keyof DadosEdicao, string>>;

export type StatusSalvamento = {
  id: string | null;
  estado: "idle" | "saving" | "saved" | "error";
  mensagem?: string;
};

export type ResultadoLote = {
  processados: number;
  atualizados: number;
  falhas: Array<{ id: string; motivo: string }>;
};

export type FuncionarioDestinoInativacao = {
  id: string;
  nome: string;
};

export type AcaoLote = "ATIVAR" | "INATIVAR" | "ALTERAR_CARGO" | "ALTERAR_PDV";

export type UseEquipeModuleReturn = {
  funcionarios: Funcionario[];
  pdvs: Pdv[];
  paginacao: Paginacao;
  kpis: KpisEquipe;
  carregandoLista: boolean;
  erroLista: string | null;
  erroCadastro: string | null;
  dialogNovoFuncionarioAberto: boolean;
  setDialogNovoFuncionarioAberto: (aberto: boolean) => void;
  dialogInativacaoAberto: boolean;
  setDialogInativacaoAberto: (aberto: boolean) => void;
  editandoId: string | null;
  setEditandoId: (id: string | null) => void;
  dadosEdicao: DadosEdicao | null;
  errosEdicao: ErrosEdicao;
  statusSalvamento: StatusSalvamento;
  ultimoSnapshot: { id: string; dados: DadosEdicao } | null;
  idsSelecionados: string[];
  executandoLote: boolean;
  resultadoLote: ResultadoLote | null;
  erroLote: string | null;
  acaoLote: AcaoLote;
  cargoLote: string;
  pdvLote: string;
  podeGerenciarEmpresa: boolean;
  podeExecutarAcoesLote: boolean;
  podeInativar: boolean;
  busca: string;
  statusFiltro: string;
  cargoFiltro: string;
  ordenarPor: string;
  direcao: string;
  pagina: number;
  porPagina: number;
  funcionariosAtivosParaDestino: Funcionario[];
  funcionariosDestinoMesmoPdv: Funcionario[];
  abaAtiva: "colaboradores" | "pdvs";
  setAbaAtiva: (aba: "colaboradores" | "pdvs") => void;
  instanciasWhatsapp: WhatsappInstanciaResumo[];
  carregandoPdvs: boolean;
  carregandoInstanciasWhatsapp: boolean;
  criandoPdv: boolean;
  criandoInstanciaWhatsapp: boolean;
  salvandoInstanciaWhatsappId: string | null;
  excluindoInstanciaWhatsappId: string | null;
  salvandoInstanciaPdvId: string | null;
  erroGestaoPdvs: string | null;
  criarPdv: (nome: string) => Promise<void>;
  criarInstanciaWhatsapp: (nome: string) => Promise<void>;
  salvarInstanciaWhatsapp: (id: string, nome: string) => Promise<boolean>;
  excluirInstanciaWhatsapp: (id: string) => Promise<void>;
  atualizarInstanciaPadraoPdv: (idPdv: string, idInstancia: string | null) => Promise<void>;
  funcionariosDestinoInativacao: FuncionarioDestinoInativacao | null;
  destinoInativacaoIndividual: string;
  setDestinoInativacaoIndividual: (destino: string) => void;
  observacaoInativacaoIndividual: string;
  setObservacaoInativacaoIndividual: (observacao: string) => void;
  executandoInativacaoIndividual: boolean;
  destinoInativacaoLote: string;
  setDestinoInativacaoLote: (destino: string) => void;
  observacaoLote: string;
  setObservacaoLote: (observacao: string) => void;
  cargoSelecionado: string;
  setCargoSelecionado: (cargo: string) => void;
  pdvSelecionado: string;
  setPdvSelecionado: (pdv: string) => void;
  atualizarParametrosUrl: (atualizacoes: Record<string, string | null>, resetarPagina?: boolean) => void;
  iniciarEdicao: (funcionario: Funcionario) => void;
  cancelarEdicao: () => void;
  aoMudarDado: (campo: keyof DadosEdicao, valor: string) => void;
  desfazerUltimaEdicao: () => Promise<void>;
  abrirModalInativacao: (funcionario: Funcionario) => void;
  confirmarInativacaoIndividual: () => Promise<void>;
  alternarSelecao: (id: string, marcado: boolean) => void;
  alternarSelecaoPagina: (marcado: boolean) => void;
  executarAcaoLote: () => Promise<void>;
  adicionarFuncionario: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setAcaoLote: (acao: AcaoLote) => void;
  setCargoLote: (cargo: string) => void;
  setPdvLote: (pdv: string) => void;
  setErroLista: (erro: string | null) => void;
  todosDaPaginaSelecionados: boolean;
  carregarFuncionarios: () => Promise<void>;
};
