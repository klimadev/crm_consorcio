import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api/http";
import { validateQuery } from "@/lib/api/route-validation";
import { withPerfis } from "@/lib/api/route-guards";
import { calcularResumoParcelas, calcularStatusParcela, inicioDoDia } from "@/lib/financeiro/parcelas";
import { esquemaListarRecebimentos } from "@/lib/validacoes";

type AbaRecebimentos = "todos" | "recebidos" | "a_vencer" | "atrasados";

function normalizarBusca(valor?: string) {
  return valor?.trim().toLowerCase() ?? "";
}

function obterPeriodoComparativo(dataInicial?: string, dataFinal?: string) {
  if (!dataInicial || !dataFinal) return null;

  const inicio = inicioDoDia(dataInicial);
  const fim = inicioDoDia(dataFinal);
  const diffMs = Math.max(fim.getTime() - inicio.getTime(), 24 * 60 * 60 * 1000);

  return {
    inicioAnterior: new Date(inicio.getTime() - diffMs),
    fimAnterior: new Date(fim.getTime() - diffMs),
  };
}

function filtrarPorAba<T extends { status: string }>(lista: T[], aba: AbaRecebimentos) {
  if (aba === "recebidos") return lista.filter((item) => item.status === "PAGO");
  if (aba === "a_vencer") return lista.filter((item) => item.status === "PENDENTE");
  if (aba === "atrasados") return lista.filter((item) => item.status === "ATRASADO");
  return lista;
}

function ordenarLista<T extends { valor: number; data_vencimento: string; data_pagamento: string | null }>(
  lista: T[],
  ordenar: "vencimento" | "pagamento" | "valor",
  direcao: "asc" | "desc",
  aba: AbaRecebimentos,
) {
  const fator = direcao === "asc" ? 1 : -1;

  return [...lista].sort((a, b) => {
    if (ordenar === "valor") {
      return (a.valor - b.valor) * fator;
    }

    if (ordenar === "pagamento") {
      const aData = new Date(a.data_pagamento ?? 0).getTime();
      const bData = new Date(b.data_pagamento ?? 0).getTime();
      return (aData - bData) * fator;
    }

    const aVencimento = new Date(a.data_vencimento).getTime();
    const bVencimento = new Date(b.data_vencimento).getTime();

    if (aba === "atrasados") {
      return aVencimento - bVencimento;
    }

    if (aba === "recebidos") {
      const aPagamento = new Date(a.data_pagamento ?? 0).getTime();
      const bPagamento = new Date(b.data_pagamento ?? 0).getTime();
      return bPagamento - aPagamento;
    }

    return (aVencimento - bVencimento) * fator;
  });
}

function paginar<T>(lista: T[], pagina: number, limite: number) {
  const inicio = (pagina - 1) * limite;
  return lista.slice(inicio, inicio + limite);
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
    const buscaNormalizada = normalizarBusca(filtros.busca);

    const parcelas = await prisma.parcela.findMany({
      where: {
        id_empresa: sessao.id_empresa,
        ...(filtros.data_inicial || filtros.data_final
          ? {
              OR: [
                {
                  data_vencimento: {
                    ...(filtros.data_inicial ? { gte: new Date(filtros.data_inicial) } : {}),
                    ...(filtros.data_final ? { lte: new Date(filtros.data_final) } : {}),
                  },
                },
                {
                  data_pagamento: {
                    ...(filtros.data_inicial ? { gte: new Date(filtros.data_inicial) } : {}),
                    ...(filtros.data_final ? { lte: new Date(filtros.data_final) } : {}),
                  },
                },
              ],
            }
          : {}),
        lead: {
          ...(filtros.id_funcionario ? { id_funcionario: filtros.id_funcionario } : {}),
          ...(filtros.id_pdv
            ? {
                funcionario: {
                  id_pdv: filtros.id_pdv,
                },
              }
            : {}),
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            valor_consorcio: true,
            estagio: {
              select: {
                nome: true,
              },
            },
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
    });

    const listaBase = parcelas.map((parcela) => {
      const statusCalculado = calcularStatusParcela({
        status: parcela.status === "PAGO" ? "PAGO" : "PENDENTE",
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
          statusCalculado === "ATRASADO"
            ? Math.max(0, Math.floor((hoje.getTime() - inicioDoDia(parcela.data_vencimento).getTime()) / (24 * 60 * 60 * 1000)))
            : 0,
      };
    });

    const listaFiltradaBusca = buscaNormalizada
      ? listaBase.filter((item) => {
          const alvo = `${item.lead.nome} ${item.lead.telefone} ${item.responsavel?.nome ?? ""} ${item.pdv?.nome ?? ""}`.toLowerCase();
          return alvo.includes(buscaNormalizada);
        })
      : listaBase;

    const listaAba = filtrarPorAba(listaFiltradaBusca, filtros.aba);
    const listaOrdenada = ordenarLista(listaAba, filtros.ordenar, filtros.direcao, filtros.aba);
    const total = listaOrdenada.length;
    const listaPaginada = paginar(listaOrdenada, filtros.pagina, filtros.limite);

    const resumoGeral = calcularResumoParcelas(listaFiltradaBusca);

    const recebidosPeriodo = listaFiltradaBusca.filter((item) => {
      if (!item.data_pagamento) return false;
      if (!filtros.data_inicial && !filtros.data_final) return true;
      const dataPagamento = new Date(item.data_pagamento);
      if (filtros.data_inicial && dataPagamento < new Date(filtros.data_inicial)) return false;
      if (filtros.data_final && dataPagamento > new Date(filtros.data_final)) return false;
      return true;
    });

    const periodoComparativo = obterPeriodoComparativo(filtros.data_inicial, filtros.data_final);
    const recebidosPeriodoAnterior = periodoComparativo
      ? listaBase.filter((item) => {
          if (!item.data_pagamento) return false;
          const dataPagamento = new Date(item.data_pagamento);
          return dataPagamento >= periodoComparativo.inicioAnterior && dataPagamento <= periodoComparativo.fimAnterior;
        })
      : [];

    const totalRecebidoPeriodo = recebidosPeriodo.reduce((acc, item) => acc + item.valor, 0);
    const totalRecebidoPeriodoAnterior = recebidosPeriodoAnterior.reduce((acc, item) => acc + item.valor, 0);
    const variacaoRecebidoPeriodo = totalRecebidoPeriodoAnterior > 0
      ? ((totalRecebidoPeriodo - totalRecebidoPeriodoAnterior) / totalRecebidoPeriodoAnterior) * 100
      : totalRecebidoPeriodo > 0
        ? 100
        : 0;

    const gruposPeriodo = new Map<string, { label: string; recebido: number; previsto: number }>();
    for (const item of listaFiltradaBusca) {
      const data = new Date(item.data_pagamento ?? item.data_vencimento);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      const label = data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const existente = gruposPeriodo.get(chave) ?? { label, recebido: 0, previsto: 0 };
      existente.previsto += item.valor;
      if (item.status === "PAGO") {
        existente.recebido += item.valor;
      }
      gruposPeriodo.set(chave, existente);
    }

    const distribuicaoStatus = ["PAGO", "PENDENTE", "ATRASADO"].map((status) => {
      const itens = listaFiltradaBusca.filter((item) => item.status === status);
      return {
        status,
        quantidade: itens.length,
        valor: itens.reduce((acc, item) => acc + item.valor, 0),
      };
    });

    return ok({
      resumo: {
        totalRecebidoPeriodo,
        totalEmAberto: resumoGeral.totalPendente,
        totalAtrasado: resumoGeral.totalAtrasado,
        taxaAdimplencia: resumoGeral.taxaAdimplencia,
        quantidadeRecebidas: resumoGeral.quantidadeRecebidas,
        quantidadePendentes: resumoGeral.quantidadePendentes,
        quantidadeAtrasadas: resumoGeral.quantidadeAtrasadas,
        quantidadeMonitoradas: listaFiltradaBusca.length,
        parcelasVencendo7Dias: listaFiltradaBusca.filter((item) => {
          if (item.status !== "PENDENTE") return false;
          const diff = inicioDoDia(item.data_vencimento).getTime() - hoje.getTime();
          const dias = diff / (24 * 60 * 60 * 1000);
          return dias >= 0 && dias <= 7;
        }).length,
        variacaoRecebidoPeriodo,
      },
      graficos: {
        recebimentosPorPeriodo: Array.from(gruposPeriodo.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, valor]) => valor),
        distribuicaoStatus,
      },
      lista: listaPaginada,
      contadoresAbas: {
        todos: listaFiltradaBusca.length,
        recebidos: listaFiltradaBusca.filter((item) => item.status === "PAGO").length,
        a_vencer: listaFiltradaBusca.filter((item) => item.status === "PENDENTE").length,
        atrasados: listaFiltradaBusca.filter((item) => item.status === "ATRASADO").length,
      },
      filtrosAplicados: filtros,
      opcoes: {
        pdvs: Array.from(
          new Map(
            listaBase
              .filter((item) => item.pdv)
              .map((item) => [item.pdv?.id, item.pdv]),
          ).values(),
        ),
        responsaveis: Array.from(
          new Map(listaBase.map((item) => [item.responsavel.id, item.responsavel])).values(),
        ),
      },
      paginacao: {
        pagina: filtros.pagina,
        limite: filtros.limite,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / filtros.limite)),
      },
    });
  });
}
