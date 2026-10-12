import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api/http";
import { validateQuery } from "@/lib/api/route-validation";
import { withPerfis } from "@/lib/api/route-guards";
import { calcularStatusParcela, inicioDoDia } from "@/lib/financeiro/parcelas";
import type { StatusParcela } from "@/lib/api/parcelas";
import { esquemaListarRecebimentos } from "@/lib/validacoes";

const DIA_MS = 24 * 60 * 60 * 1000;
const STATUS_ATIVOS = ["AGUARDANDO", "ATRASADA"] as const;
const STATUS_PERDIDOS = ["CANCELADA", "ABORTADA"] as const;

function obterPeriodoComparativo(dataInicial?: string, dataFinal?: string) {
  if (!dataInicial || !dataFinal) return null;

  const inicio = inicioDoDia(dataInicial);
  const fim = inicioDoDia(dataFinal);
  const diffMs = Math.max(fim.getTime() - inicio.getTime(), DIA_MS);

  return {
    inicioAnterior: new Date(inicio.getTime() - diffMs),
    fimAnterior: new Date(fim.getTime() - diffMs),
  };
}

export async function GET(request: NextRequest) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const { searchParams } = new URL(request.url);
    const validacao = validateQuery(
      esquemaListarRecebimentos,
      Object.fromEntries(searchParams.entries()),
    );

    if (!validacao.ok) {
      return validacao.response;
    }

    const filtros = validacao.data;
    const hoje = inicioDoDia();
    const busca = filtros.busca?.trim() ?? "";
    const dataInicial = filtros.data_inicial ? new Date(filtros.data_inicial) : null;
    const dataFinal = filtros.data_final ? new Date(filtros.data_final) : null;

    // Filtros comuns a todas as consultas: empresa + periodo (vencimento OU pagamento) + responsavel/pdv.
    const limitesPeriodo = {
      ...(dataInicial ? { gte: dataInicial } : {}),
      ...(dataFinal ? { lte: dataFinal } : {}),
    };

    const whereBase: Prisma.ParcelaWhereInput = {
      id_empresa: sessao.id_empresa,
      ...(dataInicial || dataFinal
        ? {
            OR: [
              { data_vencimento: { ...limitesPeriodo } },
              { data_pagamento: { ...limitesPeriodo } },
            ],
          }
        : {}),
      ...(filtros.id_funcionario || filtros.id_pdv
        ? {
            lead: {
              ...(filtros.id_funcionario ? { id_funcionario: filtros.id_funcionario } : {}),
              ...(filtros.id_pdv ? { funcionario: { id_pdv: filtros.id_pdv } } : {}),
            },
          }
        : {}),
    };

    // Busca textual empurrada para o banco (LIKE do SQLite ja e case-insensitive para ASCII).
    const whereBusca: Prisma.ParcelaWhereInput = busca
      ? {
          AND: [
            whereBase,
            {
              lead: {
                OR: [
                  { nome: { contains: busca } },
                  { telefone: { contains: busca } },
                  { funcionario: { nome: { contains: busca } } },
                  { funcionario: { pdv: { nome: { contains: busca } } } },
                ],
              },
            },
          ],
        }
      : whereBase;

    // Status derivado replicado em SQL (mesma semantica de calcularStatusParcela):
    // PAGA = status "PAGA" OU pagamento preenchido (fora de canceladas/abortadas);
    // AGUARDANDO/ATRASADA = status ativo sem pagamento, separado pelo vencimento.
    const condPaga: Prisma.ParcelaWhereInput = {
      OR: [
        { status: "PAGA" },
        { status: { notIn: [...STATUS_PERDIDOS] }, data_pagamento: { not: null } },
      ],
    };
    const condAguardando: Prisma.ParcelaWhereInput = {
      status: { in: [...STATUS_ATIVOS] },
      data_pagamento: null,
      data_vencimento: { gte: hoje },
    };
    const condAtrasada: Prisma.ParcelaWhereInput = {
      status: { in: [...STATUS_ATIVOS] },
      data_pagamento: null,
      data_vencimento: { lt: hoje },
    };
    const condCanceladas: Prisma.ParcelaWhereInput = { status: "CANCELADA" };
    const condAbortadas: Prisma.ParcelaWhereInput = { status: "ABORTADA" };
    const condPerdidas: Prisma.ParcelaWhereInput = { status: { in: [...STATUS_PERDIDOS] } };

    const condAba: Prisma.ParcelaWhereInput | undefined =
      filtros.aba === "recebidos"
        ? condPaga
        : filtros.aba === "a_vencer"
          ? condAguardando
          : filtros.aba === "atrasados"
            ? condAtrasada
            : filtros.aba === "canceladas"
              ? condPerdidas
              : undefined;

    const whereLista: Prisma.ParcelaWhereInput = condAba
      ? { AND: [whereBusca, condAba] }
      : whereBusca;

    // Ordenacao preserva os casos especiais da versao anterior: atrasados forca vencimento asc
    // e recebidos forca pagamento desc quando ordenando por vencimento. "id" desempata para
    // paginacao deterministica.
    const orderBy: Prisma.ParcelaOrderByWithRelationInput[] =
      filtros.ordenar === "valor"
        ? [{ valor: filtros.direcao }, { id: filtros.direcao }]
        : filtros.ordenar === "pagamento"
          ? [{ data_pagamento: filtros.direcao }, { id: filtros.direcao }]
          : filtros.aba === "atrasados"
            ? [{ data_vencimento: "asc" }, { id: "asc" }]
            : filtros.aba === "recebidos"
              ? [{ data_pagamento: "desc" }, { id: "desc" }]
              : [{ data_vencimento: filtros.direcao }, { id: filtros.direcao }];

    const periodoComparativo = obterPeriodoComparativo(filtros.data_inicial, filtros.data_final);

    const whereRecebidoPeriodo: Prisma.ParcelaWhereInput = {
      AND: [whereBusca, { data_pagamento: { not: null, ...limitesPeriodo } }],
    };

    // O periodo anterior compara contra o conjunto sem filtro de busca, como na versao anterior.
    const whereRecebidoPeriodoAnterior: Prisma.ParcelaWhereInput | null = periodoComparativo
      ? {
          AND: [
            whereBase,
            {
              data_pagamento: {
                gte: periodoComparativo.inicioAnterior,
                lte: periodoComparativo.fimAnterior,
              },
            },
          ],
        }
      : null;

    // Vencendo nos proximos 7 dias = status AGUARDANDO com vencimento entre hoje e hoje+7.
    const limiteVencimento7Dias = new Date(hoje.getTime() + 8 * DIA_MS);
    const whereVencendo7Dias: Prisma.ParcelaWhereInput = {
      AND: [whereBusca, condAguardando, { data_vencimento: { lt: limiteVencimento7Dias } }],
    };

    const [
      listaParcelas,
      totalLista,
      aggPaga,
      aggAguardando,
      aggAtrasada,
      aggCanceladas,
      aggAbortadas,
      aggPerdidas,
      totalMonitoradas,
      totalVencendo7Dias,
      gruposChurn,
      aggRecebidoPeriodo,
      aggRecebidoPeriodoAnterior,
      linhasGrafico,
      funcionariosOpcoes,
    ] = await Promise.all([
      prisma.parcela.findMany({
        where: whereLista,
        orderBy,
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite,
        include: {
          lead: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              valor_consorcio: true,
              estagio: { select: { nome: true } },
              funcionario: {
                select: {
                  id: true,
                  nome: true,
                  pdv: { select: { id: true, nome: true } },
                },
              },
            },
          },
        },
      }),
      prisma.parcela.count({ where: whereLista }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condPaga] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condAguardando] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condAtrasada] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condCanceladas] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condAbortadas] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.aggregate({ where: { AND: [whereBusca, condPerdidas] }, _count: true, _sum: { valor: true } }),
      prisma.parcela.count({ where: whereBusca }),
      prisma.parcela.count({ where: whereVencendo7Dias }),
      prisma.parcela.groupBy({
        by: ["numero_parcela"],
        where: { AND: [whereBusca, condCanceladas] },
        orderBy: { numero_parcela: "asc" },
        _count: { _all: true },
        _sum: { valor: true },
      }),
      prisma.parcela.aggregate({ where: whereRecebidoPeriodo, _sum: { valor: true } }),
      whereRecebidoPeriodoAnterior
        ? prisma.parcela.aggregate({ where: whereRecebidoPeriodoAnterior, _sum: { valor: true } })
        : Promise.resolve(null),
      // Apenas colunas leves, sem include de relacoes, para os buckets mensais do grafico:
      // o bucket por mes usa fuso local do Date em JS, igual a versao anterior.
      prisma.parcela.findMany({
        where: whereBusca,
        select: { valor: true, status: true, data_vencimento: true, data_pagamento: true },
      }),
      prisma.funcionario.findMany({
        where: { id_empresa: sessao.id_empresa },
        select: { id: true, nome: true, pdv: { select: { id: true, nome: true } } },
        orderBy: { nome: "asc" },
      }),
    ]);

    const totalRecebido = aggPaga._sum.valor ?? 0;
    const totalEmAberto = aggAguardando._sum.valor ?? 0;
    const totalAtrasado = aggAtrasada._sum.valor ?? 0;
    const totalPerdidoChurn = aggPerdidas._sum.valor ?? 0;
    const quantidadeRecebidas = aggPaga._count;
    const quantidadePendentes = aggAguardando._count;
    const quantidadeAtrasadas = aggAtrasada._count;
    const quantidadePerdidas = aggPerdidas._count;

    const totalPrevisto = totalRecebido + totalAtrasado + totalEmAberto;
    const denominadorRetencao = totalRecebido + totalPerdidoChurn;

    const totalRecebidoPeriodo = aggRecebidoPeriodo._sum.valor ?? 0;
    const totalRecebidoPeriodoAnterior = aggRecebidoPeriodoAnterior?._sum.valor ?? 0;
    const variacaoRecebidoPeriodo = totalRecebidoPeriodoAnterior > 0
      ? ((totalRecebidoPeriodo - totalRecebidoPeriodoAnterior) / totalRecebidoPeriodoAnterior) * 100
      : totalRecebidoPeriodo > 0
        ? 100
        : 0;

    // Bucket mensal do grafico: mes da data de pagamento (ou vencimento), calculado em fuso local.
    const gruposPeriodo = new Map<string, { label: string; recebido: number; previsto: number }>();
    for (const linha of linhasGrafico) {
      // Churn (CANCELADA/ABORTADA) nao entra no previsto ativo.
      if (linha.status === "CANCELADA" || linha.status === "ABORTADA") continue;

      const data = linha.data_pagamento ?? linha.data_vencimento;
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      const existente = gruposPeriodo.get(chave) ?? {
        label: data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        recebido: 0,
        previsto: 0,
      };
      existente.previsto += linha.valor;
      if (linha.status === "PAGA" || linha.data_pagamento) {
        existente.recebido += linha.valor;
      }
      gruposPeriodo.set(chave, existente);
    }

    const lista = listaParcelas.map((parcela) => {
      const statusCalculado = calcularStatusParcela({
        status: parcela.status as StatusParcela,
        data_vencimento: parcela.data_vencimento.toISOString(),
        data_pagamento: parcela.data_pagamento?.toISOString() ?? null,
      });

      return {
        id: parcela.id,
        numero_parcela: parcela.numero_parcela,
        quantidade_total: parcela.quantidade_total,
        valor: parcela.valor,
        status: statusCalculado,
        data_vencimento: parcela.data_vencimento.toISOString(),
        data_pagamento: parcela.data_pagamento?.toISOString() ?? null,
        lead: {
          id: parcela.lead.id,
          nome: parcela.lead.nome,
          telefone: parcela.lead.telefone,
          valor_consorcio: parcela.lead.valor_consorcio,
          estagio: parcela.lead.estagio.nome,
        },
        pdv: parcela.lead.funcionario.pdv
          ? {
              id: parcela.lead.funcionario.pdv.id,
              nome: parcela.lead.funcionario.pdv.nome,
            }
          : null,
        responsavel: {
          id: parcela.lead.funcionario.id,
          nome: parcela.lead.funcionario.nome,
        },
        dias_em_atraso:
          statusCalculado === "ATRASADA"
            ? Math.max(0, Math.floor((hoje.getTime() - inicioDoDia(parcela.data_vencimento).getTime()) / DIA_MS))
            : 0,
      };
    });

    const churnPorParcela = gruposChurn.map((grupo) => ({
      numero_parcela: grupo.numero_parcela,
      quantidade: grupo._count._all,
      valor: grupo._sum.valor ?? 0,
    }));

    const opcoesPdvs = Array.from(
      new Map(
        funcionariosOpcoes.map((funcionario) => [
          funcionario.pdv.id,
          { id: funcionario.pdv.id, nome: funcionario.pdv.nome },
        ]),
      ).values(),
    );

    return ok({
      resumo: {
        totalRecebidoPeriodo,
        totalEmAberto,
        totalAtrasado,
        taxaAdimplencia: totalPrevisto > 0 ? (totalRecebido / totalPrevisto) * 100 : 0,
        quantidadeRecebidas,
        quantidadePendentes,
        quantidadeAtrasadas,
        quantidadeMonitoradas: totalMonitoradas,
        parcelasVencendo7Dias: totalVencendo7Dias,
        variacaoRecebidoPeriodo,
        totalPerdidoChurn,
        quantidadePerdidas,
        taxaRetencaoParcelas: denominadorRetencao > 0 ? totalRecebido / denominadorRetencao : 1,
        churnPorParcela,
        quantidadeAbortadas: aggAbortadas._count,
        totalAbortado: aggAbortadas._sum.valor ?? 0,
      },
      graficos: {
        recebimentosPorPeriodo: Array.from(gruposPeriodo.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, valor]) => valor),
        distribuicaoStatus: [
          { status: "PAGA", quantidade: aggPaga._count, valor: totalRecebido },
          { status: "AGUARDANDO", quantidade: aggAguardando._count, valor: totalEmAberto },
          { status: "ATRASADA", quantidade: aggAtrasada._count, valor: totalAtrasado },
          { status: "CANCELADA", quantidade: aggCanceladas._count, valor: aggCanceladas._sum.valor ?? 0 },
          { status: "ABORTADA", quantidade: aggAbortadas._count, valor: aggAbortadas._sum.valor ?? 0 },
        ],
      },
      lista,
      contadoresAbas: {
        todos: totalMonitoradas,
        recebidos: quantidadeRecebidas,
        a_vencer: quantidadePendentes,
        atrasados: quantidadeAtrasadas,
        canceladas: quantidadePerdidas,
      },
      filtrosAplicados: filtros,
      opcoes: {
        pdvs: opcoesPdvs,
        responsaveis: funcionariosOpcoes.map((funcionario) => ({
          id: funcionario.id,
          nome: funcionario.nome,
        })),
      },
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total: totalLista,
        totalPaginas: Math.max(1, Math.ceil(totalLista / filtros.limite)),
      },
    });
  });
}
