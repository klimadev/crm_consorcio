import type { Produto, SchemaLayoutProduto } from "@/lib/api/produtos";

export type ProdutoFormState = {
  nome: string;
  descricao: string;
  ativo: boolean;
  schemaLayout: SchemaLayoutProduto;
};

export type UseProdutosModuleReturn = {
  produtos: Produto[];
  carregando: boolean;
  salvando: boolean;
  erro: string | null;
  dialogAberto: boolean;
  setDialogAberto: (aberto: boolean) => void;
  produtoEmEdicao: Produto | null;
  form: ProdutoFormState;
  atualizarForm: (dados: Partial<ProdutoFormState>) => void;
  adicionarCampo: () => void;
  atualizarCampo: (campoId: string, dados: Record<string, unknown>) => void;
  removerCampo: (campoId: string) => void;
  moverCampo: (campoId: string, direcao: "cima" | "baixo") => void;
  abrirCriacao: () => void;
  abrirEdicao: (produto: Produto) => void;
  salvarProduto: () => Promise<void>;
  recarregar: () => Promise<void>;
};
