import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const body = (await request.json()) as { nome?: string };
  const nome = body.nome?.trim();
  const { id } = await params;

  if (!nome) {
    return NextResponse.json({ erro: "Nome do PDV e obrigatorio." }, { status: 400 });
  }

  const atualizados = await prisma.pdv.updateMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
    data: { nome },
  });

  if (atualizados.count === 0) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const { id } = await params;

  const deletados = await prisma.pdv.deleteMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (deletados.count === 0) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
