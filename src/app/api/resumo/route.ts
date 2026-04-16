import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { detectarPendenciasDinamicas } from "@/lib/pendencias-dinamicas";
import type {
  ResumoPeriodoFiltro,
  ResumoResposta,
  ResumoSerieMensal,
  ResumoSerieSemanal,
  ResumoRankingAtendente,
  ResumoParticipacaoAtendente,
  ResumoPendenciaItem,
} from "@/lib/api/resumo";

function somarPercentual(atual: number, anterior: number) {
  if (anterior > 0) return Number((((atual - anterior) / anterior) * 100).toFixed(1));
  return atual > 0 ? 100 : 0;
}

function normalizarMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0);
}

function fimDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 23, 59, 59, 999);
}

function parsePeriodoFiltro(valor: string | null): ResumoPeriodoFiltro {
  if (valor === "mensal" || valor === "semanal" || valor === "todo") {
    return valor;
  }
  return "mensal";
}

function obterSemanaDoMes(data: Date) {
  return Math.floor((data.getDate() - 1) / 7) + 1;
}

function diferencaDias(inicio: Date, fim: Date) {
  return Math.floor((fim.getTime() - inicio.getTime()) / 86400000) + 1;
}

function obterFaixaPorPeriodo(periodo: ResumoPeriodoFiltro, hoje: Date) {
  const hojeInicio = inicioDoDia(hoje);
  const hojeFim = fimDoDia(hoje);

  if (periodo === "semanal") {
    const diaSemana = hojeInicio.getDay() || 7;
    const inicio = new Date(hojeInicio);
    inicio.setDate(hojeInicio.getDate() - diaSemana + 1);
    return { inicio, fim: hojeFim };
  }

  if (periodo === "mensal") {
    const inicio = new Date(hojeInicio.getFullYear(), hojeInicio.getMonth(), 1, 0, 0, 0, 0);
    return { inicio, fim: hojeFim };
  }

  const inicio = new Date(hojeInicio.getFullYear() - 1, hojeInicio.getMonth(), 1, 0, 0, 0, 0);
  return { inicio, fim: hojeFim };
}

function porcentagemSobreposicao(intervaloA: { inicio: Date; fim: Date }, intervaloB: { inicio: Date; fim: Date }) {
  const inicio = Math.max(intervaloA.inicio.getTime(), intervaloB.inicio.getTime());
  const fim = Math.min(intervaloA.fim.getTime(), intervaloB.fim.getTime());
  if (inicio > fim) return 0;

  const diasMeta = diferencaDias(intervaloB.inicio, intervaloB.fim);
  if (diasMeta <= 0) return 0;

  const diasIntersecao = Math.floor((fim - inicio) / 86400000) + 1;
  return Math.min(1, Math.max(0, diasIntersecao / diasMeta));
}

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const whereLeads = await whereLeadsPorPerfil(auth.sessao);
  const hoje = new Date();
  const searchParams = new URL(request.url).searchParams;
  const periodo = parsePeriodoFiltro(searchParams.get("periodo"));
  const faixaSelecionada = obterFaixaPorPeriodo(periodo, hoje);
  const totalDiasFaixa = diferencaDias(faixaSelecionada.inicio, faixaSelecionada.fim);
  const inicioPeriodoAnterior = new Date(faixaSelecionada.inicio);
  inicioPeriodoAnterior.setDate(inicioPeriodoAnterior.getDate() - totalDiasFaixa);
  const fimPeriodoAnterior = new Date(faixaSelecionada.inicio.getTime() - 1);

  const leads = await prisma.lead.findMany({
    where: whereLeads,
    include: {
      estagio: true,
      funcionario: {
        select: { id: true, nome: true, email: true, id_pdv: true },
      },
    },
  });

  const leadsPeriodoAtual = leads.filter((lead) => lead.criado_em >= faixaSelecionada.inicio && lead.criado_em <= faixaSelecionada.fim);
  const totalNegocios = leadsPeriodoAtual.length;
  const ganhos = leadsPeriodoAtual.filter((lead) => lead.estagio.tipo === "GANHO");
  const perdidos = leadsPeriodoAtual.filter((lead) => lead.estagio.tipo === "PERDIDO");
  const abertos = leadsPeriodoAtual.filter((lead) => lead.estagio.tipo === "ABERTO");

  const totalGanhosValor = ganhos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);
  const totalPerdidosValor = perdidos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);
  const totalEmAbertoValor = abertos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);

  const negociosPeriodoAtual = leadsPeriodoAtual;
  const negociosPeriodoAnterior = leads.filter((lead) => lead.criado_em >= inicioPeriodoAnterior && lead.criado_em <= fimPeriodoAnterior);
  const totalNegociosPeriodoAtual = negociosPeriodoAtual.length;

  const variacoes = {
    negocios: somarPercentual(totalNegociosPeriodoAtual, negociosPeriodoAnterior.length),
    ganhos: somarPercentual(
      negociosPeriodoAtual.filter((lead) => lead.estagio.tipo === "GANHO").length,
      negociosPeriodoAnterior.filter((lead) => lead.estagio.tipo === "GANHO").length,
    ),
    perdidos: somarPercentual(
      negociosPeriodoAtual.filter((lead) => lead.estagio.tipo === "PERDIDO").length,
      negociosPeriodoAnterior.filter((lead) => lead.estagio.tipo === "PERDIDO").length,
    ),
    aberto: somarPercentual(
      negociosPeriodoAtual.filter((lead) => lead.estagio.tipo === "ABERTO").length,
      negociosPeriodoAnterior.filter((lead) => lead.estagio.tipo === "ABERTO").length,
    ),
  };

  const totalMesesNoPeriodo = Math.max(
    1,
    ((faixaSelecionada.fim.getFullYear() - faixaSelecionada.inicio.getFullYear()) * 12)
      + (faixaSelecionada.fim.getMonth() - faixaSelecionada.inicio.getMonth())
      + 1,
  );
  const meses = Array.from({ length: totalMesesNoPeriodo }).map((_, indice) => {
    const data = new Date(
      faixaSelecionada.inicio.getFullYear(),
      faixaSelecionada.inicio.getMonth() + indice,
      1,
    );
    return {
      chave: normalizarMes(data),
      label: data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      ganhos: 0,
      perdidos: 0,
      abertos: 0,
    };
  });

  for (const lead of leadsPeriodoAtual) {
    const chave = normalizarMes(lead.criado_em);
    const alvo = meses.find((mes) => mes.chave === chave);
    if (!alvo) continue;
    if (lead.estagio.tipo === "GANHO") alvo.ganhos += 1;
    else if (lead.estagio.tipo === "PERDIDO") alvo.perdidos += 1;
    else alvo.abertos += 1;
  }

  const evolucaoSemanalMap = new Map<string, { label: string; ordem: number; inicio: Date; fim: Date; cotas: number; volume: number }>();

  if (periodo === "semanal") {
    for (let indice = 0; indice < totalDiasFaixa; indice += 1) {
      const data = new Date(faixaSelecionada.inicio);
      data.setDate(faixaSelecionada.inicio.getDate() + indice);
      const inicio = inicioDoDia(data);
      const fim = fimDoDia(data);
      evolucaoSemanalMap.set(`dia-${indice}`, {
        label: data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
        ordem: indice,
        inicio,
        fim,
        cotas: 0,
        volume: 0,
      });
    }
  } else if (periodo === "mensal" && totalDiasFaixa <= 10) {
    for (let indice = 0; indice < totalDiasFaixa; indice += 1) {
      const data = new Date(faixaSelecionada.inicio);
      data.setDate(faixaSelecionada.inicio.getDate() + indice);
      const inicio = inicioDoDia(data);
      const fim = fimDoDia(data);
      evolucaoSemanalMap.set(`dia-mes-${indice}`, {
        label: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ordem: indice,
        inicio,
        fim,
        cotas: 0,
        volume: 0,
      });
    }
  } else if (periodo === "mensal") {
    const totalSemanas = Math.max(1, obterSemanaDoMes(faixaSelecionada.fim));
    for (let semana = 1; semana <= totalSemanas; semana += 1) {
      const inicio = new Date(faixaSelecionada.inicio.getFullYear(), faixaSelecionada.inicio.getMonth(), (semana - 1) * 7 + 1, 0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);
      fim.setHours(23, 59, 59, 999);
      if (fim > faixaSelecionada.fim) {
        fim.setTime(faixaSelecionada.fim.getTime());
      }
      evolucaoSemanalMap.set(`semana-${semana}`, {
        label: `Semana ${semana}`,
        ordem: semana,
        inicio,
        fim,
        cotas: 0,
        volume: 0,
      });
    }
  } else {
    for (let indice = 0; indice < 12; indice += 1) {
      const data = new Date(faixaSelecionada.inicio.getFullYear(), faixaSelecionada.inicio.getMonth() + indice, 1, 0, 0, 0, 0);
      const inicio = new Date(data);
      const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999);
      evolucaoSemanalMap.set(`mes-${indice}`, {
        label: data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        ordem: indice,
        inicio,
        fim: fim > faixaSelecionada.fim ? faixaSelecionada.fim : fim,
        cotas: 0,
        volume: 0,
      });
    }
  }

  for (const lead of leads) {
    if (lead.estagio.tipo !== "GANHO" || !lead.aprovado_em) continue;

    const dataAprovacao = new Date(lead.aprovado_em);
    if (dataAprovacao < faixaSelecionada.inicio || dataAprovacao > faixaSelecionada.fim) continue;

    for (const bucket of evolucaoSemanalMap.values()) {
      if (dataAprovacao >= bucket.inicio && dataAprovacao <= bucket.fim) {
        bucket.cotas += 1;
        bucket.volume += lead.valor_consorcio;
        break;
      }
    }
  }

  const metasGanhos = await prisma.metaPeriodo.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ativo: true,
      data_inicio: { lte: faixaSelecionada.fim },
      data_fim: { gte: faixaSelecionada.inicio },
      template: {
        ativo: true,
        origem_resultado: "ESTAGIO_GANHO",
        ...(auth.sessao.perfil === "GERENTE" ? { id_pdv: auth.sessao.id_pdv } : {}),
      },
    },
    include: {
      template: {
        select: {
          tipo_meta: true,
        },
      },
    },
  });

  const evolucaoSemanal: ResumoSerieSemanal[] = Array.from(evolucaoSemanalMap.values())
    .sort((a, b) => a.ordem - b.ordem)
    .map((bucket) => {
      let metaCotas = 0;
      let metaVolume = 0;

      for (const meta of metasGanhos) {
        const peso = porcentagemSobreposicao(
          { inicio: bucket.inicio, fim: bucket.fim },
          { inicio: meta.data_inicio, fim: meta.data_fim },
        );
        if (peso <= 0) continue;

        const alvoPonderado = meta.alvo * peso;
        if (meta.template?.tipo_meta === "VOLUME") {
          metaCotas += alvoPonderado;
        } else {
          metaVolume += alvoPonderado;
        }
      }

      const metaCotasNormalizada = Math.round(metaCotas);
      const metaVolumeNormalizada = Number(metaVolume.toFixed(2));

      return {
        label: bucket.label,
        cotas: bucket.cotas,
        volume: Number(bucket.volume.toFixed(2)),
        metaCotas: metaCotasNormalizada,
        metaVolume: metaVolumeNormalizada,
        bateuMetaCotas: metaCotasNormalizada > 0 ? bucket.cotas >= metaCotasNormalizada : false,
        bateuMetaVolume: metaVolumeNormalizada > 0 ? bucket.volume >= metaVolumeNormalizada : false,
      };
    });

  const porFuncionario = new Map<string, { nome: string; email: string; quantidade: number; valor: number }>();
  for (const lead of negociosPeriodoAtual) {
    const funcionario = lead.funcionario;
    const existente = porFuncionario.get(funcionario.id) ?? { nome: funcionario.nome, email: funcionario.email, quantidade: 0, valor: 0 };
    existente.quantidade += 1;
    existente.valor += lead.valor_consorcio;
    porFuncionario.set(funcionario.id, existente);
  }

  const participacaoAtendentes: ResumoParticipacaoAtendente[] = Array.from(porFuncionario.entries())
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .map(([funcionarioId, item]) => ({
      funcionarioId,
      nome: item.nome,
      email: item.email,
      quantidade: item.quantidade,
      valor: item.valor,
      percentual: totalNegociosPeriodoAtual > 0 ? Number(((item.quantidade / totalNegociosPeriodoAtual) * 100).toFixed(1)) : 0,
    }));

  const rankingsAtendentes: ResumoRankingAtendente[] = Array.from(porFuncionario.entries())
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .map(([funcionarioId, item]) => ({
      funcionarioId,
      nome: item.nome,
      email: item.email,
      quantidadeNegocios: item.quantidade,
      ticketMedio: item.quantidade > 0 ? Number((item.valor / item.quantidade).toFixed(2)) : 0,
      valorTotal: Number(item.valor.toFixed(2)),
    }));

  for (const ranking of rankingsAtendentes) {
    const quantidadeComValor = negociosPeriodoAtual.filter(
      (lead) => lead.funcionario.id === ranking.funcionarioId && lead.valor_consorcio > 0,
    ).length;
    ranking.ticketMedio = quantidadeComValor > 0
      ? Number((ranking.valorTotal / quantidadeComValor).toFixed(2))
      : 0;
  }

  const pendencias = await detectarPendenciasDinamicas(
    auth.sessao.id_empresa,
    auth.sessao.perfil === "COLABORADOR" ? auth.sessao.id_usuario : undefined,
    whereLeads,
  );
  const pendenciasPorTipo = new Map<string, number>();
  for (const pendencia of pendencias) {
    pendenciasPorTipo.set(pendencia.tipo, (pendenciasPorTipo.get(pendencia.tipo) ?? 0) + 1);
  }

  const itensPendencia: ResumoPendenciaItem[] = Array.from(pendenciasPorTipo.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, quantidade]) => ({ tipo, quantidade, descricao: tipo.replaceAll("_", " ").toLowerCase() }));

  const response: ResumoResposta = {
    resumo: {
      totalNegocios,
      totalGanhosValor,
      totalGanhosQuantidade: ganhos.length,
      totalPerdidosValor,
      totalPerdidosQuantidade: perdidos.length,
      totalEmAbertoValor,
      totalEmAbertoQuantidade: abertos.length,
    },
    variacoes,
    graficos: {
      evolucaoMensal: meses.map(({ label, ganhos, perdidos, abertos }): ResumoSerieMensal => ({ label, ganhos, perdidos, abertos })),
      evolucaoSemanal,
      participacaoAtendentes,
    },
    rankings: {
      atendentes: rankingsAtendentes,
    },
    operacao: {
      pendencias: {
        total: pendencias.length,
        criticas: pendencias.filter((pendencia) => pendencia.tipo === "DOCUMENTO_APROVACAO_PENDENTE" || pendencia.tipo === "PLANO_PAGAMENTO_PENDENTE").length,
        alertas: pendencias.filter((pendencia) => pendencia.tipo === "ESTAGIO_PARADO" || pendencia.tipo === "APROVACAO_GERENCIA_PENDENTE").length,
        leadsImpactados: new Set(pendencias.map((pendencia) => pendencia.id_lead)).size,
        itens: itensPendencia,
      },
    },
    meta: {
      perfil: auth.sessao.perfil,
      visaoEquipe: auth.sessao.perfil !== "COLABORADOR",
      visaoIndividual: auth.sessao.perfil === "COLABORADOR",
    },
    filtro: {
      periodo: {
        tipo: periodo,
        inicio: faixaSelecionada.inicio.toISOString(),
        fim: faixaSelecionada.fim.toISOString(),
      },
    },
  };

  return NextResponse.json(response);
}
