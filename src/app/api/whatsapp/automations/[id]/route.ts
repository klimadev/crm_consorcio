import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = (await request.json()) as { ativo?: boolean };

  const automacao = await prisma.whatsappAutomacao.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!automacao) {
    return NextResponse.json({ erro: "Automação não encontrada." }, { status: 404 });
  }

  const atualizada = await prisma.whatsappAutomacao.update({
    where: { id: automacao.id },
    data: {
      ativo: body.ativo,
    },
  });

  return NextResponse.json({ automacao: atualizada });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;

  const automacao = await prisma.whatsappAutomacao.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!automacao) {
    return NextResponse.json({ erro: "Automação não encontrada." }, { status: 404 });
  }

  await prisma.whatsappAutomacao.delete({
    where: { id: automacao.id },
  });

  return NextResponse.json({ ok: true });
}
