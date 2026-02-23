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

  const pendenciasComLead = await Promise.all(
    pendencias.map(async (p) => {
      const lead = await prisma.lead.findUnique({
        where: { id: p.id_lead },
        select: {
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
      return { ...p, lead };
    })
  );

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
