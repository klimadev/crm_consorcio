import type { Produto, SchemaLayoutProduto } from "@/lib/api/produtos";

export type ProdutosPageInitialState = {
  produtos: Produto[];
  erroInicial: string | null;
  falhaCarregamentoInicial: boolean;
};

export type ProdutoFormState = {
  nome: string;
  descricao: string;
  ativo: boolean;
  schemaLayout: SchemaLayoutProduto;
};

export type EtapaProdutoForm = "basico" | "campos" | "revisao";

export type UseProdutosCatalogoReturn = {
  produtos: Produto[];
  totalProdutos: number;
  totalAtivos: number;
  totalCampos: number;
  mediaCamposPorProduto: number;
  carregando: boolean;
  erro: string | null;
  falhaCarregamentoInicial: boolean;
  abrirCriacao: () => void;
  abrirEdicao: (produto: Produto) => void;
  recarregar: () => Promise<void>;
};

export type UseProdutoWizardReturn = {
  produtoEmEdicao: Produto | null;
  form: ProdutoFormState;
  erro: string | null;
  salvando: boolean;
  etapaAtual: EtapaProdutoForm;
  indiceEtapaAtual: number;
  etapas: Array<{
    id: EtapaProdutoForm;
    titulo: string;
    descricao: string;
  }>;
  podeAvancarEtapaAtual: boolean;
  resumoFormulario: {
    quantidadeCampos: number;
    quantidadeObrigatorios: number;
    quantidadeResumo: number;
  };
  atualizarForm: (dados: Partial<ProdutoFormState>) => void;
  adicionarCampo: () => void;
  atualizarCampo: (campoId: string, dados: Record<string, unknown>) => void;
  removerCampo: (campoId: string) => void;
  moverCampo: (campoId: string, direcao: "cima" | "baixo") => void;
  irParaEtapa: (etapa: EtapaProdutoForm) => void;
  avancarEtapa: () => void;
  voltarEtapa: () => void;
  voltarCatalogo: () => void;
  salvarProduto: () => Promise<void>;
};
