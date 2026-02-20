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
    observacoes?: string;
    telefone?: string;
    valor_consorcio?: number;
    motivo_perda?: string | null;
  };

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

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: body.observacoes,
      telefone: body.telefone,
      valor_consorcio: body.valor_consorcio,
      motivo_perda: body.motivo_perda,
    },
  });

  return NextResponse.json({ lead: atualizado });
}
