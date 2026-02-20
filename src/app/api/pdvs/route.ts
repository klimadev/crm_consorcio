import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const pdvs = await prisma.pdv.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({ pdvs });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const body = (await request.json()) as { nome?: string };
  const nome = body.nome?.trim();

  if (!nome) {
    return NextResponse.json({ erro: "Nome do PDV e obrigatorio." }, { status: 400 });
  }

  const pdv = await prisma.pdv.create({
    data: {
      nome,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  return NextResponse.json({ pdv });
}
