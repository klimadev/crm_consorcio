import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api/http";
import { validateQuery } from "@/lib/api/route-validation";
import { withPerfis } from "@/lib/api/route-guards";
import { inicioDoDia } from "@/lib/financeiro/parcelas";
import { montarCarteira } from "@/lib/financeiro/carteira";
import type { RecebimentosResposta } from "@/lib/api/recebimentos";
import { gravarCacheRecebimentos, lerCacheRecebimentos } from "@/lib/financeiro/cache-recebimentos";
import {
  consultarBucketsMensais,
  consultarCarteiraPorLead,
  consultarResumoAgregado,
  consultarTotalRecebidoAnterior,
  type FiltrosAgregacao,
} from "@/lib/financeiro/consultas-recebimentos";
import { esquemaListarRecebimentos } from "@/lib/validacoes";

const DIA_MS = 24 * 60 * 60 * 1000;

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

// Painel de recebimentos: um scan por granularidade (resumo global, gráfico
// mensal, carteira por cliente) mais dois groupBy indexados, tudo em paralelo,
// com cache em memória invalidado por toda mutação de parcela. Detalhes do
// porquê de cada consulta em lib/financeiro/consultas-recebimentos.ts.
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

    const chaveCache = [
      `recebimentos:${sessao.id_empresa}`,
      filtros.busca ?? "",
      filtros.data_inicial ?? "",
      filtros.data_final ?? "",
      filtros.id_funcionario ?? "",
      filtros.id_pdv ?? "",
    ].join("|");

    const emCache = lerCacheRecebimentos(chaveCache);
    if (emCache) {
      return ok(emCache);
    }

    const hoje = inicioDoDia();
    const dataInicial = filtros.data_inicial ? new Date(filtros.data_inicial) : null;
    const dataFinal = filtros.data_final ? new Date(filtros.data_final) : null;
    const filtrosAgregacao: FiltrosAgregacao = {
      idEmpresa: sessao.id_empresa,
      dataInicial,
      dataFinal,
      busca: filtros.busca?.trim() ?? "",
      idFuncionario: filtros.id_funcionario ?? null,
      idPdv: filtros.id_pdv ?? null,
    };

    const limiteVencimento7Dias = new Date(hoje.getTime() + 8 * DIA_MS);
    const periodoComparativo = obterPeriodoComparativo(filtros.data_inicial, filtros.data_final);

    // Filtro do gráfico de churn (por número da parcela), espelhando a
    // semântica de whereBusca (período + busca + responsável/PDV).
    const limitesPeriodo = {
      ...(dataInicial ? { gte: dataInicial } : {}),
      ...(dataFinal ? { lte: dataFinal } : {}),
    };
    const whereChurn: Prisma.ParcelaWhereInput = {
      id_empresa: sessao.id_empresa,
      status: "CANCELADA",
      ...(dataInicial || dataFinal
        ? { OR: [{ data_vencimento: { ...limitesPeriodo } }, { data_pagamento: { ...limitesPeriodo } }] }
        : {}),
      ...(filtros.id_funcionario || filtros.id_pdv
        ? {
            lead: {
              ...(filtros.id_funcionario ? { id_funcionario: filtros.id_funcionario } : {}),
              ...(filtros.id_pdv ? { funcionario: { id_pdv: filtros.id_pdv } } : {}),
            },
          }
        : {}),
      ...(filtrosAgregacao.busca
        ? {
            lead: {
              OR: [
                { nome: { contains: filtrosAgregacao.busca } },
                { telefone: { contains: filtrosAgregacao.busca } },
                { funcionario: { nome: { contains: filtrosAgregacao.busca } } },
                { funcionario: { pdv: { nome: { contains: filtrosAgregacao.busca } } } },
              ],
            },
          }
        : {}),
    };

    const [
      resumoAgg,
      buckets,
      carteiraAgregada,
      gruposChurn,
      gruposPagasPlano,
      funcionariosOpcoes,
      totalRecebidoPeriodoAnterior,
    ] = await Promise.all([
      consultarResumoAgregado(prisma, filtrosAgregacao, { hoje, limiteVencendo7Dias: limiteVencimento7Dias }),
      consultarBucketsMensais(prisma, filtrosAgregacao),
      consultarCarteiraPorLead(prisma, filtrosAgregacao, { hoje }),
      prisma.parcela.groupBy({
        by: ["numero_parcela"],
        where: whereChurn,
        orderBy: { numero_parcela: "asc" },
        _count: { _all: true },
        _sum: { valor: true },
      }),
      // Progresso do plano: pagas globais do lead, fora do filtro de período.
      prisma.parcela.groupBy({
        by: ["id_lead"],
        where: { id_empresa: sessao.id_empresa, status: "PAGA" },
        _count: { _all: true },
      }),
      prisma.funcionario.findMany({
        where: { id_empresa: sessao.id_empresa },
        select: { id: true, nome: true, pdv: { select: { id: true, nome: true } } },
        orderBy: { nome: "asc" },
      }),
      periodoComparativo
        ? consultarTotalRecebidoAnterior(prisma, filtrosAgregacao, {
            inicio: periodoComparativo.inicioAnterior,
            fim: periodoComparativo.fimAnterior,
          })
        : Promise.resolve(0),
    ]);

    const totalPrevisto = resumoAgg.totalRecebido + resumoAgg.totalAtrasado + resumoAgg.totalEmAberto;
    const denominadorRetencao = resumoAgg.totalRecebido + resumoAgg.totalPerdido;
    const variacaoRecebidoPeriodo =
      totalRecebidoPeriodoAnterior > 0
        ? ((resumoAgg.totalRecebidoPeriodo - totalRecebidoPeriodoAnterior) / totalRecebidoPeriodoAnterior) * 100
        : resumoAgg.totalRecebidoPeriodo > 0
          ? 100
          : 0;

    const idsLeads = new Set<string>();
    for (const grupo of [
      ...carteiraAgregada.grupoAtraso,
      ...carteiraAgregada.grupoAguardando,
      ...carteiraAgregada.grupoPagasPeriodo,
    ]) {
      idsLeads.add(grupo.id_lead);
    }
    const leadsCarteira =
      idsLeads.size > 0
        ? await prisma.lead.findMany({
            where: { id: { in: [...idsLeads] }, id_empresa: sessao.id_empresa },
            select: { id: true, nome: true, telefone: true },
          })
        : [];
    const pagasGlobais = Object.fromEntries(
      gruposPagasPlano.map((grupo) => [grupo.id_lead, grupo._count._all]),
    );
    const carteira = montarCarteira({
      leads: leadsCarteira,
      ...carteiraAgregada,
      pagasGlobais,
    });

    const opcoesPdvs = Array.from(
      new Map(
        funcionariosOpcoes.map((funcionario) => [
          funcionario.pdv.id,
          { id: funcionario.pdv.id, nome: funcionario.pdv.nome },
        ]),
      ).values(),
    );

    const payload: RecebimentosResposta = {
      resumo: {
        totalRecebidoPeriodo: resumoAgg.totalRecebidoPeriodo,
        totalEmAberto: resumoAgg.totalEmAberto,
        totalAtrasado: resumoAgg.totalAtrasado,
        taxaAdimplencia: totalPrevisto > 0 ? (resumoAgg.totalRecebido / totalPrevisto) * 100 : 0,
        quantidadeRecebidas: resumoAgg.quantidadeRecebidas,
        quantidadePendentes: resumoAgg.quantidadePendentes,
        quantidadeAtrasadas: resumoAgg.quantidadeAtrasadas,
        quantidadeMonitoradas: resumoAgg.quantidadeMonitoradas,
        parcelasVencendo7Dias: resumoAgg.parcelasVencendo7Dias,
        variacaoRecebidoPeriodo,
        totalPerdidoChurn: resumoAgg.totalPerdido,
        quantidadePerdidas: resumoAgg.quantidadePerdidas,
        taxaRetencaoParcelas:
          denominadorRetencao > 0 ? resumoAgg.totalRecebido / denominadorRetencao : 1,
        churnPorParcela: gruposChurn.map((grupo) => ({
          numero_parcela: grupo.numero_parcela,
          quantidade: grupo._count._all,
          valor: grupo._sum.valor ?? 0,
        })),
        quantidadeAbortadas: resumoAgg.quantidadeAbortadas,
        totalAbortado: resumoAgg.totalAbortado,
      },
      graficos: {
        recebimentosPorPeriodo: buckets.map((bucket) => ({
          label: bucket.label,
          recebido: bucket.recebido,
          previsto: bucket.previsto,
        })),
        distribuicaoStatus: [
          { status: "PAGA", quantidade: resumoAgg.quantidadeRecebidas, valor: resumoAgg.totalRecebido },
          { status: "AGUARDANDO", quantidade: resumoAgg.quantidadePendentes, valor: resumoAgg.totalEmAberto },
          { status: "ATRASADA", quantidade: resumoAgg.quantidadeAtrasadas, valor: resumoAgg.totalAtrasado },
          { status: "CANCELADA", quantidade: resumoAgg.quantidadeCanceladas, valor: resumoAgg.totalCancelado },
          { status: "ABORTADA", quantidade: resumoAgg.quantidadeAbortadas, valor: resumoAgg.totalAbortado },
        ],
      },
      carteira,
      filtrosAplicados: filtros,
      opcoes: {
        pdvs: opcoesPdvs,
        responsaveis: funcionariosOpcoes.map((funcionario) => ({
          id: funcionario.id,
          nome: funcionario.nome,
        })),
      },
    };

    gravarCacheRecebimentos(chaveCache, payload);
    return ok(payload);
  });
}
