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
    id_whatsapp_instancia?: string | null;
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

  const querAtualizarInstancia = Object.prototype.hasOwnProperty.call(body, "id_whatsapp_instancia");
  if (querAtualizarInstancia && auth.sessao.perfil !== "EMPRESA" && auth.sessao.perfil !== "GERENTE") {
    return NextResponse.json({ erro: "Apenas a empresa ou gerente pode definir a instancia do lead." }, { status: 403 });
  }

  let idWhatsappInstanciaAtualizada: string | null | undefined;
  if (querAtualizarInstancia) {
    const instanciaId = body.id_whatsapp_instancia?.trim() ?? null;
    if (instanciaId) {
      const instancia = await prisma.whatsappInstancia.findFirst({
        where: {
          id: instanciaId,
          id_empresa: auth.sessao.id_empresa,
        },
        select: { id: true },
      });

      if (!instancia) {
        return NextResponse.json({ erro: "Instancia WhatsApp invalida para a empresa." }, { status: 400 });
      }
    }
    idWhatsappInstanciaAtualizada = instanciaId;
  }

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: body.observacoes,
      telefone: body.telefone,
      valor_consorcio: body.valor_consorcio,
      motivo_perda: body.motivo_perda,
      documento_aprovacao_url: body.documento_aprovacao_url ?? undefined,
      ...(querAtualizarInstancia ? { id_whatsapp_instancia: idWhatsappInstanciaAtualizada } : {}),
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
        : {}),
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return NextResponse.json({ sucesso: true });
}
