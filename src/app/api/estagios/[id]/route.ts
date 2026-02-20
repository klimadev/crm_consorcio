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
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar estagios." }, { status: 403 });
  }

  const body = (await request.json()) as { nome?: string; ordem?: number };
  const nome = body.nome?.trim();
  const ordem = Number(body.ordem);
  const { id } = await params;

  if (!nome || Number.isNaN(ordem) || ordem <= 0) {
    return NextResponse.json({ erro: "Nome e ordem validos sao obrigatorios." }, { status: 400 });
  }

  const atualizados = await prisma.estagioFunil.updateMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
    data: { nome, ordem },
  });

  if (atualizados.count === 0) {
    return NextResponse.json({ erro: "Estagio nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
