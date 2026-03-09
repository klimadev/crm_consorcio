import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaAtualizarProdutoLead } from "@/lib/validacoes";
import { notFound, ok } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string; leadProdutoId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id, leadProdutoId } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaAtualizarProdutoLead, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const leadProduto = await prisma.leadProduto.findFirst({
    where: {
      id: leadProdutoId,
      id_lead: id,
      id_empresa: auth.sessao.id_empresa,
    },
    select: { id: true },
  });

  if (!leadProduto) {
    return notFound("Produto vinculado ao lead nao encontrado.");
  }

  const dados = validacao.data;
  const atualizado = await prisma.leadProduto.update({
    where: { id: leadProdutoId },
    data: {
      valores_layout: dados.valores_layout ? JSON.stringify(dados.valores_layout) : undefined,
      observacoes: dados.observacoes !== undefined ? dados.observacoes ?? null : undefined,
    },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
          slug: true,
          ativo: true,
        },
      },
    },
  });

  return ok({ produto: atualizado });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id, leadProdutoId } = await params;

  const leadProduto = await prisma.leadProduto.findFirst({
    where: {
      id: leadProdutoId,
      id_lead: id,
      id_empresa: auth.sessao.id_empresa,
    },
    select: { id: true },
  });

  if (!leadProduto) {
    return notFound("Produto vinculado ao lead nao encontrado.");
  }

  await prisma.leadProduto.delete({
    where: { id: leadProdutoId },
  });

  return ok({ ok: true });
}
