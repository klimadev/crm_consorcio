import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeSessao } from "../../permissoes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { leadId } = await params;

  // Verificar se o lead existe e pertence à empresa
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, id_empresa: auth.sessao.id_empresa },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead não encontrado." }, { status: 404 });
  }

  // Se for colaborador, verificar se o lead pertence a ele
  if (auth.sessao.perfil === "COLABORADOR" && lead.id_funcionario !== auth.sessao.id_usuario) {
    return NextResponse.json({ erro: "Você não tem acesso a este lead." }, { status: 403 });
  }

  const pendencias = await prisma.pendencia.findMany({
    where: { id_lead: leadId },
    orderBy: { criado_em: "desc" },
  });

  return NextResponse.json({ pendencias });
}
