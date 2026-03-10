import { ModuloProdutos } from "@/modules/produtos";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import type { Produto } from "@/lib/api/produtos";
import { prisma } from "@/lib/prisma";
import { podeVerEquipe } from "@/lib/permissoes";
import { redirect } from "next/navigation";
import type { ProdutosPageInitialState } from "@/modules/produtos/types";

function serializarProduto(produto: {
  id: string;
  id_empresa: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativo: boolean;
  schema_layout: string;
  criado_em: Date;
  atualizado_em: Date;
}): Produto {
  return {
    ...produto,
    criado_em: produto.criado_em.toISOString(),
    atualizado_em: produto.atualizado_em.toISOString(),
  };
}

export default async function PaginaProdutos() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  if (!podeVerEquipe(sessao)) {
    redirect("/kanban");
  }

  const estadoInicial: ProdutosPageInitialState = await (prisma as typeof prisma & {
    produto: {
      findMany: typeof prisma.$queryRaw extends (...args: never[]) => unknown
        ? (args: {
            where: { id_empresa: string };
            orderBy: Array<{ ativo: "desc" } | { nome: "asc" }>;
          }) => Promise<import("@/lib/api/produtos").Produto[]>
        : never;
    };
  }).produto.findMany({
    where: { id_empresa: sessao.id_empresa },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  }).then((produtos) => ({
    produtos: produtos.map(serializarProduto),
    erroInicial: null,
    falhaCarregamentoInicial: false,
  })).catch(() => ({
    produtos: [],
    erroInicial: "Nao foi possivel carregar os produtos internos.",
    falhaCarregamentoInicial: true,
  }));

  return <ModuloProdutos estadoInicial={estadoInicial} />;
}
