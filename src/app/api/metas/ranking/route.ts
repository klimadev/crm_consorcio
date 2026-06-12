import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { calcularProgresso, calcularRanking } from "@/modules/metas/lib/calculator";
import { handleRouteError } from "@/lib/api/route-errors";
import { validateQuery } from "@/lib/api/route-validation";
import { z } from "zod";

const schemaRankingQuery = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  id_equipe: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const params = request.nextUrl.searchParams;
  const validacao = validateQuery(schemaRankingQuery, {
    mes_referencia: params.get("mes_referencia") ?? undefined,
    id_equipe: params.get("id_equipe") ?? undefined,
  });
  if (!validacao.ok) return validacao.response;

  const filtros = validacao.data;

  // GERENTE: só vê ranking da própria equipe
  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv) return respostaSemPermissao();
    if (filtros.id_equipe && filtros.id_equipe !== auth.sessao.id_pdv) return respostaSemPermissao();
  }

  try {
    // Busca todas as metas ativas da empresa no período
    const where: any = {
      id_empresa: auth.sessao.id_empresa,
      ativo: true,
    };

    if (auth.sessao.perfil === "GERENTE") {
      where.id_equipe = auth.sessao.id_pdv;
    } else if (filtros.id_equipe) {
      where.id_equipe = filtros.id_equipe;
    }

    if (filtros.mes_referencia) {
      where.mes_referencia = filtros.mes_referencia;
    }

    const rows = await prisma.metaNova.findMany({
      where,
      include: { equipe: { select: { id: true, nome: true } } },
    });

    // Calcula progresso de cada meta
    const metasComProgresso = await Promise.all(
      rows.map(async (row) => {
        const dataInicio = new Date(row.data_inicio);
        const dataFim = new Date(row.data_fim);

        let pagamentos: { valor: number }[] | undefined;
        let leadsFechados: { valor_consorcio?: number }[] | undefined;

        if (row.origem === "PAGAMENTOS") {
          const result = await prisma.parcela.aggregate({
            where: {
              id_empresa: row.id_empresa,
              status: "PAGO",
              data_pagamento: { gte: dataInicio, lte: dataFim },
              lead: row.id_equipe ? { funcionario: { id_pdv: row.id_equipe } } : undefined,
            },
            _sum: { valor: true },
          });
          pagamentos = [{ valor: result._sum.valor ?? 0 }];
        } else {
          leadsFechados = await prisma.lead.findMany({
            where: {
              id_empresa: row.id_empresa,
              aprovado_em: { gte: dataInicio, lte: dataFim },
              ...(row.id_equipe ? { funcionario: { id_pdv: row.id_equipe } } : {}),
            },
            select: { id: true, valor_consorcio: true },
          });
        }

        const progresso = calcularProgresso(
          { alvo: row.alvo, tipo_meta: row.tipo_meta, origem: row.origem as "PAGAMENTOS" | "FECHADOS", data_fim: row.data_fim },
          pagamentos,
          leadsFechados,
        );

        return {
          id: row.id,
          id_empresa: row.id_empresa,
          titulo: row.titulo,
          tipo_meta: row.tipo_meta as "VALOR" | "VOLUME",
          origem: row.origem as "PAGAMENTOS" | "FECHADOS",
          alvo: row.alvo,
          semana: row.semana,
          mes_referencia: row.mes_referencia,
          data_inicio: row.data_inicio.toISOString(),
          data_fim: row.data_fim.toISOString(),
          ativo: row.ativo,
          id_equipe: row.id_equipe,
          criado_em: row.criado_em.toISOString(),
          atualizado_em: row.atualizado_em.toISOString(),
          equipe: row.equipe ? { id: row.equipe.id, nome: row.equipe.nome } : null,
          progresso,
        };
      }),
    );

    // Ranking calculado pelo calculator.ts (agrupa por equipe)
    const ranking = calcularRanking(metasComProgresso as any);

    const mediaGeral =
      ranking.length > 0
        ? Number((ranking.reduce((acc, item) => acc + item.percentual, 0) / ranking.length).toFixed(1))
        : 0;

    return NextResponse.json({
      ranking,
      media_geral: mediaGeral,
      total_participantes: ranking.length,
    });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao calcular ranking.", "Erro ao calcular ranking:");
  }
}
