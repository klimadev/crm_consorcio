import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeVerEquipe(auth.sessao)) {
    return NextResponse.json({ erro: "Sem permissao." }, { status: 403 });
  }

  const { id } = await params;

  const funcionario = await prisma.funcionario.updateMany({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    data: {
      ativo: false,
    },
  });

  if (funcionario.count === 0) {
    return NextResponse.json({ erro: "Funcionario nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
