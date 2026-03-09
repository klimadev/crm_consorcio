import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaCriarProduto } from "@/lib/validacoes";
import { badRequest, ok } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

function gerarSlugProduto(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function gerarSlugDisponivel(idEmpresa: string, nome: string) {
  const base = gerarSlugProduto(nome) || "produto";

  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    const slug = tentativa === 0 ? base : `${base}-${tentativa + 1}`;
    const existente = await prisma.produto.findFirst({
      where: { id_empresa: idEmpresa, slug },
      select: { id: true },
    });

    if (!existente) {
      return slug;
    }
  }

  return `${base}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const produtos = await prisma.produto.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return ok({ produtos });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaCriarProduto, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const dados = validacao.data;
  const slug = await gerarSlugDisponivel(auth.sessao.id_empresa, dados.nome);

  const schemaLayout = JSON.stringify({
    versao: dados.schema_layout.versao,
    campos: [...dados.schema_layout.campos].sort((a, b) => a.ordem - b.ordem),
  });

  const produto = await prisma.produto.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      nome: dados.nome,
      slug,
      descricao: dados.descricao ?? null,
      ativo: dados.ativo ?? true,
      schema_layout: schemaLayout,
    },
  });

  if (!produto) {
    return badRequest("Nao foi possivel criar o produto.");
  }

  return ok({ produto }, 201);
}
