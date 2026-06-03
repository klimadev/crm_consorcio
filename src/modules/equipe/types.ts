export type Pdv = {
  id: string;
  nome: string;
  id_whatsapp_instancia?: string | null;
  alerta_configuracao?: {
    tipo: "sem_instancia";
    mensagem: string;
  } | null;
  whatsapp_instancia?: {
    id: string;
    nome: string;
    status: string;
  } | null;
  funcionarios?: Array<{
    id: string;
    nome: string;
    email?: string;
    cargo: string;
    ativo?: boolean;
  }>;
};

export type PdvEmEdicao = {
  id: string;
  nome: string;
  id_whatsapp_instancia?: string | null;
};

export type PdvParaExcluir = {
  id: string;
  nome: string;
};

export type WhatsappInstancia = {
  id: string;
  nome: string;
  status: string;
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
  id_pdv?: string | null;
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
  todosFuncionarios: Funcionario[];
  pdvs: Pdv[];
  paginacao: Paginacao;
  kpis: KpisEquipe;
  kpisTotais: KpisEquipe;
  carregandoLista: boolean;
  carregandoCadastro: boolean;
  atualizando: boolean;
  erroLista: string | null;
  erroCadastro: string | null;
  dialogNovoFuncionarioAberto: boolean;
  setDialogNovoFuncionarioAberto: (aberto: boolean) => void;
  abrirDialogNovoFuncionario: (aberto: boolean) => void;
  dialogInativacaoAberto: boolean;
  setDialogInativacaoAberto: (aberto: boolean) => void;
  editandoId: string | null;
  setEditandoId: (id: string | null) => void;
  editandoFuncionario: Funcionario | null;
  drawerEdicaoAberto: boolean;
  fecharDrawerEdicao: () => void;
  dadosEdicao: DadosEdicao | null;
  setDadosEdicao: (dados: DadosEdicao | null) => void;
  errosEdicao: ErrosEdicao;
  statusSalvamento: StatusSalvamento;
  ultimoSnapshot: { id: string; dados: DadosEdicao } | null;
  idsSelecionados: string[];
  executandoLote: boolean;
  resultadoLote: ResultadoLote | null;
  erroLote: string | null;
  lotePodeExecutar: boolean;
  loteResumoAcao: string;
  lotePendencia: string | null;
  acaoLote: AcaoLote;
  cargoLote: string;
  pdvLote: string;
  podeGerenciarEmpresa: boolean;
  idPdvGerenciado?: string | null;
  podeExecutarAcoesLote: boolean;
  podeInativar: boolean;
  podeAdicionarFuncionario: boolean;
  busca: string;
  idPdvFiltro: string;
  statusFiltro: string;
  cargoFiltro: string;
  ordenarPor: string;
  direcao: string;
  pagina: number;
  porPagina: number;
  funcionariosAtivosParaDestino: Funcionario[];
  funcionariosDestinoMesmoPdv: Funcionario[];
  carregandoPdvs: boolean;
  criandoPdv: boolean;
  pdvEmEdicao: PdvEmEdicao | null;
  setPdvEmEdicao: (pdv: PdvEmEdicao | null) => void;
  pdvParaExcluir: PdvParaExcluir | null;
  setPdvParaExcluir: (pdv: PdvParaExcluir | null) => void;
  salvandoPdvId: string | null;
  excluindoPdvId: string | null;
  erroGestaoPdvs: string | null;
  criarPdv: (nome: string) => Promise<boolean>;
  editarPdv: (id: string, nome: string, id_whatsapp_instancia?: string | null) => Promise<boolean>;
  excluirPdv: (id: string) => Promise<void>;
  instancias: WhatsappInstancia[];
  funcionariosDestinoInativacao: FuncionarioDestinoInativacao | null;
  destinoInativacaoIndividual: string;
  setDestinoInativacaoIndividual: (destino: string) => void;
  observacaoInativacaoIndividual: string;
  setObservacaoInativacaoIndividual: (observacao: string) => void;
  executandoInativacaoIndividual: boolean;
  erroInativacaoIndividual: string | null;
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
  salvarEdicaoAtual: (dadosOverride?: DadosEdicao) => Promise<boolean>;
  desfazerUltimaEdicao: () => Promise<void>;
  abrirModalInativacao: (funcionario: Funcionario) => void;
  confirmarInativacaoIndividual: () => Promise<void>;
  reativarFuncionarioIndividual: (funcionario: Funcionario) => Promise<void>;
  alternarSelecao: (id: string, marcado: boolean) => void;
  alternarSelecaoPagina: (marcado: boolean) => void;
  executarAcaoLote: () => Promise<void>;
  adicionarFuncionario: (evento: React.FormEvent<HTMLFormElement>) => Promise<boolean>;
  setAcaoLote: (acao: AcaoLote) => void;
  setCargoLote: (cargo: string) => void;
  setPdvLote: (pdv: string) => void;
  setErroLista: (erro: string | null) => void;
  todosDaPaginaSelecionados: boolean;
  carregarFuncionarios: () => Promise<void>;
  contadoresFiltro: {
    status: Record<string, number>;
    cargo: Record<string, number>;
  };
  temAlteracoesNaoSalvas: boolean;
  limparFiltros: () => void;
  loginComo: (id: string) => Promise<void>;
  loginComoLoading: string | null;
};
