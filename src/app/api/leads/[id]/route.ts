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
    documento_aprovacao_url?: string | null;
  };

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {} // GERENTE pode ver todos do PDV, validado abaixo
          : {}),
    },
    include: { funcionario: { select: { id_pdv: true } } },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode editar leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: body.observacoes,
      telefone: body.telefone,
      valor_consorcio: body.valor_consorcio,
      motivo_perda: body.motivo_perda,
      documento_aprovacao_url: body.documento_aprovacao_url ?? undefined,
    },
  });

  return NextResponse.json({ lead: atualizado });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {} // GERENTE pode ver todos do PDV, validado abaixo
          : {}),
    },
    include: { funcionario: { select: { id_pdv: true } } },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode excluir leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return NextResponse.json({ sucesso: true });
}
