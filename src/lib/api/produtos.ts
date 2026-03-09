type ApiErro = {
  erro?: string;
};

type ResultadoApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export type CampoProduto = {
  id: string;
  tipo: "texto" | "textarea" | "numero" | "moeda" | "telefone" | "boolean" | "select" | "data" | "imagem";
  label: string;
  obrigatorio: boolean;
  placeholder?: string;
  ajuda?: string;
  opcoes?: { label: string; value: string }[];
  largura: "sm" | "md" | "lg" | "full";
  visivelNoResumo: boolean;
  ordem: number;
};

export type SchemaLayoutProduto = {
  versao: number;
  campos: CampoProduto[];
};

export type Produto = {
  id: string;
  id_empresa: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  schema_layout: string;
  criado_em: string;
  atualizado_em: string;
};

export type LeadProduto = {
  id: string;
  id_empresa: string;
  id_lead: string;
  id_produto: string;
  nome_snapshot: string;
  schema_snapshot: string;
  valores_layout: string;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
  produto?: {
    id: string;
    nome: string;
    slug: string;
    ativo: boolean;
  };
};

export type PayloadCriarProduto = {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  schema_layout: SchemaLayoutProduto;
};

export type PayloadAtualizarProduto = Partial<PayloadCriarProduto>;

export type PayloadAnexarProdutoLead = {
  id_produto: string;
  valores_layout: Record<string, string | number | boolean | null | string[]>;
  observacoes?: string | null;
};

export type PayloadAtualizarProdutoLead = {
  valores_layout?: Record<string, string | number | boolean | null | string[]>;
  observacoes?: string | null;
};

async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export function parseSchemaLayout(schemaLayout: string): SchemaLayoutProduto {
  try {
    const parsed = JSON.parse(schemaLayout) as SchemaLayoutProduto;
    return {
      versao: parsed.versao ?? 1,
      campos: Array.isArray(parsed.campos) ? parsed.campos : [],
    };
  } catch {
    return { versao: 1, campos: [] };
  }
}

export function parseValoresLayout(valoresLayout: string): Record<string, string | number | boolean | null | string[]> {
  try {
    return JSON.parse(valoresLayout) as Record<string, string | number | boolean | null | string[]>;
  } catch {
    return {};
  }
}

export async function listarProdutos(): Promise<ResultadoApi<{ produtos: Produto[] }>> {
  const resposta = await fetch("/api/produtos");
  const json = await lerJsonSeguro<{ produtos?: Produto[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar produtos." };
  }

  return { ok: true, dados: { produtos: json.produtos ?? [] } };
}

export async function criarProduto(payload: PayloadCriarProduto): Promise<ResultadoApi<{ produto: Produto }>> {
  const resposta = await fetch("/api/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ produto?: Produto } & ApiErro>(resposta);
  if (!resposta.ok || !json.produto) {
    return { ok: false, erro: json.erro ?? "Erro ao criar produto." };
  }

  return { ok: true, dados: { produto: json.produto } };
}

export async function atualizarProduto(idProduto: string, payload: PayloadAtualizarProduto): Promise<ResultadoApi<{ produto: Produto }>> {
  const resposta = await fetch(`/api/produtos/${idProduto}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ produto?: Produto } & ApiErro>(resposta);
  if (!resposta.ok || !json.produto) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar produto." };
  }

  return { ok: true, dados: { produto: json.produto } };
}

export async function listarProdutosLead(idLead: string): Promise<ResultadoApi<{ produtos: LeadProduto[] }>> {
  const resposta = await fetch(`/api/leads/${idLead}/produtos`);
  const json = await lerJsonSeguro<{ produtos?: LeadProduto[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao carregar produtos do lead." };
  }

  return { ok: true, dados: { produtos: json.produtos ?? [] } };
}

export async function anexarProdutoLead(idLead: string, payload: PayloadAnexarProdutoLead): Promise<ResultadoApi<{ produto: LeadProduto }>> {
  const resposta = await fetch(`/api/leads/${idLead}/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ produto?: LeadProduto } & ApiErro>(resposta);
  if (!resposta.ok || !json.produto) {
    return { ok: false, erro: json.erro ?? "Erro ao anexar produto ao lead." };
  }

  return { ok: true, dados: { produto: json.produto } };
}

export async function atualizarProdutoLead(
  idLead: string,
  idLeadProduto: string,
  payload: PayloadAtualizarProdutoLead,
): Promise<ResultadoApi<{ produto: LeadProduto }>> {
  const resposta = await fetch(`/api/leads/${idLead}/produtos/${idLeadProduto}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await lerJsonSeguro<{ produto?: LeadProduto } & ApiErro>(resposta);
  if (!resposta.ok || !json.produto) {
    return { ok: false, erro: json.erro ?? "Erro ao atualizar produto do lead." };
  }

  return { ok: true, dados: { produto: json.produto } };
}

export async function removerProdutoLead(idLead: string, idLeadProduto: string): Promise<ResultadoApi<null>> {
  const resposta = await fetch(`/api/leads/${idLead}/produtos/${idLeadProduto}`, {
    method: "DELETE",
  });

  const json = await lerJsonSeguro<ApiErro>(resposta);
  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao remover produto do lead." };
  }

  return { ok: true, dados: null };
}
