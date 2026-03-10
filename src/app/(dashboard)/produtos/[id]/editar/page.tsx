import { redirect } from "next/navigation";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import type { Produto } from "@/lib/api/produtos";
import { prisma } from "@/lib/prisma";
import { podeVerEquipe } from "@/lib/permissoes";
import { ModuloProdutoWizard } from "@/modules/produtos";

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

type Params = {
  params: Promise<{ id: string }>;
};

export default async function PaginaEditarProduto({ params }: Params) {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  if (!podeVerEquipe(sessao)) {
    redirect("/kanban");
  }

  const { id } = await params;
  const produto = await (prisma as typeof prisma & {
    produto: {
      findFirst: typeof prisma.$queryRaw extends (...args: never[]) => unknown
        ? (args: {
            where: { id: string; id_empresa: string };
          }) => Promise<{
            id: string;
            id_empresa: string;
            nome: string;
            slug: string;
            descricao: string | null;
            ativo: boolean;
            schema_layout: string;
            criado_em: Date;
            atualizado_em: Date;
          } | null>
        : never;
    };
  }).produto.findFirst({
    where: {
      id,
      id_empresa: sessao.id_empresa,
    },
  });

  if (!produto) {
    redirect("/produtos");
  }

  return <ModuloProdutoWizard produtoInicial={serializarProduto(produto)} />;
}
