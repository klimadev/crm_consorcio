import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { ok, notFound, forbidden } from "@/lib/api/http";
import { detectarPendenciasDinamicasLead } from "@/lib/pendencias-dinamicas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withSessao(request, async ({ sessao }) => {
    const { leadId } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, id_empresa: sessao.id_empresa },
    });

    if (!lead) {
      return notFound("Lead não encontrado.");
    }

    if (sessao.perfil === "COLABORADOR" && lead.id_funcionario !== sessao.id_usuario) {
      return forbidden("Você não tem acesso a este lead.");
    }

    const pendencias = await detectarPendenciasDinamicasLead(leadId);

    return ok({ pendencias });
  });
}
