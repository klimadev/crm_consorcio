import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaAnexarProdutoLead } from "@/lib/validacoes";
import { badRequest, notFound, ok } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    select: { id: true },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  const produtos = await prisma.leadProduto.findMany({
    where: { id_empresa: auth.sessao.id_empresa, id_lead: id },
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
    orderBy: { criado_em: "desc" },
  });

  return ok({ produtos });
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaAnexarProdutoLead, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const dados = validacao.data;

  const [lead, produto] = await Promise.all([
    prisma.lead.findFirst({
      where: { id, id_empresa: auth.sessao.id_empresa },
      select: { id: true },
    }),
    prisma.produto.findFirst({
      where: { id: dados.id_produto, id_empresa: auth.sessao.id_empresa, ativo: true },
      select: {
        id: true,
        nome: true,
        schema_layout: true,
      },
    }),
  ]);

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  if (!produto) {
    return badRequest("Produto invalido para a empresa.");
  }

  const leadProduto = await prisma.leadProduto.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      id_lead: id,
      id_produto: produto.id,
      nome_snapshot: produto.nome,
      schema_snapshot: produto.schema_layout,
      valores_layout: JSON.stringify(dados.valores_layout),
      observacoes: dados.observacoes ?? null,
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

  return ok({ produto: leadProduto }, 201);
}
