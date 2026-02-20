import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    id_estagio?: string;
    motivo_perda?: string;
  };

  if (!body.id_estagio) {
    return NextResponse.json({ erro: "Destino obrigatorio." }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : {}),
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  const estagioDestino = await prisma.estagioFunil.findFirst({
    where: {
      id: body.id_estagio,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!estagioDestino) {
    return NextResponse.json({ erro: "Estagio destino invalido." }, { status: 400 });
  }

  if (estagioDestino.tipo === "PERDIDO" && !body.motivo_perda?.trim()) {
    return NextResponse.json({ erro: "Motivo de perda e obrigatorio." }, { status: 400 });
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      id_estagio: estagioDestino.id,
      motivo_perda: estagioDestino.tipo === "PERDIDO" ? body.motivo_perda?.trim() : null,
    },
  });

  return NextResponse.json({ lead: leadAtualizado });
}
