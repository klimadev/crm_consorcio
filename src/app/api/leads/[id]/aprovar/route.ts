import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeAprovarLead, podeGerenciarRecursoNoPdv } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeAprovarLead(auth.sessao)) {
    return NextResponse.json({ erro: "Apenas gerência pode aprovar leads." }, { status: 403 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    include: {
      funcionario: {
        select: {
          id_pdv: true,
        },
      },
      estagio: {
        select: {
          id: true,
          nome: true,
          tipo: true,
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  if (!podeGerenciarRecursoNoPdv(auth.sessao, lead.funcionario?.id_pdv ?? null)) {
    return NextResponse.json({ erro: "Sem permissao para aprovar lead de outro PDV." }, { status: 403 });
  }

  if (lead.estagio.nome !== "Pré Aprovação") {
    return NextResponse.json(
      { erro: "Lead precisa estar no estagio 'Pré Aprovação' para ser aprovado." },
      { status: 400 },
    );
  }

  if (!lead.documento_aprovacao_url) {
    return NextResponse.json(
      { erro: "Lead precisa ter documento de aprovação antes de ser aprovado." },
      { status: 400 },
    );
  }

  if (lead.aprovado_em) {
    return NextResponse.json({ lead, mensagem: "Lead já foi aprovado." });
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      aprovado_em: new Date(),
      aprovado_por: auth.sessao.id_usuario,
    },
  });

  return NextResponse.json({ lead: leadAtualizado });
}
