import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeSessao } from "../../permissoes";
import { detectarPendenciasDinamicasLead } from "@/lib/pendencias-dinamicas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, id_empresa: auth.sessao.id_empresa },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead não encontrado." }, { status: 404 });
  }

  if (auth.sessao.perfil === "COLABORADOR" && lead.id_funcionario !== auth.sessao.id_usuario) {
    return NextResponse.json({ erro: "Você não tem acesso a este lead." }, { status: 403 });
  }

  const pendencias = await detectarPendenciasDinamicasLead(leadId);

  return NextResponse.json({ pendencias });
}
