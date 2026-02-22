import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeSessao, wherePendenciasPorPerfil } from "./permissoes";
import { detectarPendenciasAutomaticas } from "@/lib/pendencias-automaticas";

export async function GET(request: NextRequest) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const wherePendencias = wherePendenciasPorPerfil(auth.sessao);

  const pendencias = await prisma.pendencia.findMany({
    where: wherePendencias,
    include: {
      lead: {
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
      },
    },
    orderBy: { criado_em: "desc" },
  });

  return NextResponse.json({ pendencias });
}

// POST - Detectar pendências automaticamente (substitui criação manual)
export async function POST(request: NextRequest) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  // Apenas EMPRESA pode executar detecção automática
  if (auth.sessao.perfil !== "EMPRESA") {
    return NextResponse.json(
      { erro: "Apenas a EMPRESA pode executar a detecção automática de pendências." },
      { status: 403 }
    );
  }

  // Detectar pendências automaticamente
  const resultado = await detectarPendenciasAutomaticas(auth.sessao.id_empresa);

  return NextResponse.json({
    mensagem: "Detecção automática concluída.",
    totalProcessados: resultado.totalProcessados,
    pendenciasDetectadas: resultado.pendenciasDetectadas.length,
  });
}
