import { NextRequest } from "next/server";
import { withSessao, withPerfis } from "@/lib/api/route-guards";
import { ok } from "@/lib/api/http";
import { detectarPendenciasDinamicas } from "@/lib/pendencias-dinamicas";
import { prisma } from "@/lib/prisma";
import { whereLeadsPorPerfil } from "@/lib/permissoes";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const whereLeads = await whereLeadsPorPerfil(sessao);
    
    const pendencias = await detectarPendenciasDinamicas(
      sessao.id_empresa,
      sessao.perfil === "COLABORADOR" ? sessao.id_usuario : undefined,
      whereLeads
    );

    const leadIds = pendencias.map((p) => p.id_lead);
    const leadsComDados = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: {
        id: true,
        nome: true,
        telefone: true,
        valor_consorcio: true,
        funcionario: {
          select: {
            id: true,
            nome: true,
            pdv: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    const leadMap = new Map(leadsComDados.map((lead) => [lead.id, lead]));

    const pendenciasComLead = pendencias.map((p) => ({
      ...p,
      lead: leadMap.get(p.id_lead) ?? null,
    }));

    return ok({ pendencias: pendenciasComLead });
  });
}

export async function POST(request: NextRequest) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const pendencias = await detectarPendenciasDinamicas(sessao.id_empresa);

    return ok({
      mensagem: "Detecção de pendências concluída.",
      totalProcessados: pendencias.length,
      pendenciasDetectadas: pendencias.filter(p => !p.resolvida).length,
    });
  });
}
