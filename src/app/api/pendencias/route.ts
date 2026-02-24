import { NextRequest, NextResponse } from "next/server";
import { exigeSessao } from "./permissoes";
import { detectarPendenciasDinamicas } from "@/lib/pendencias-dinamicas";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const pendencias = await detectarPendenciasDinamicas(
    auth.sessao.id_empresa,
    auth.sessao.perfil === "COLABORADOR" ? auth.sessao.id_usuario : undefined
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

  return NextResponse.json({ pendencias: pendenciasComLead });
}

export async function POST(request: NextRequest) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (auth.sessao.perfil !== "EMPRESA") {
    return NextResponse.json(
      { erro: "Apenas a EMPRESA pode executar a detecção de pendências." },
      { status: 403 }
    );
  }

  const pendencias = await detectarPendenciasDinamicas(auth.sessao.id_empresa);

  return NextResponse.json({
    mensagem: "Detecção de pendências concluída.",
    totalProcessados: pendencias.length,
    pendenciasDetectadas: pendencias.filter(p => !p.resolvida).length,
  });
}
