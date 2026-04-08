import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { detectarPendenciasDinamicas } from "@/lib/pendencias-dinamicas";
import type {
  ResumoResposta,
  ResumoSerieMensal,
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

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const whereLeads = await whereLeadsPorPerfil(auth.sessao);
  const hoje = new Date();
  const inicioPeriodo = new Date(hoje);
  inicioPeriodo.setDate(inicioPeriodo.getDate() - 30);
  const inicioPeriodoAnterior = new Date(inicioPeriodo);
  inicioPeriodoAnterior.setDate(inicioPeriodoAnterior.getDate() - 30);

  const leads = await prisma.lead.findMany({
    where: whereLeads,
    include: {
      estagio: true,
      funcionario: {
        select: { id: true, nome: true, email: true, id_pdv: true },
      },
    },
  });

  const totalNegocios = leads.length;
  const ganhos = leads.filter((lead) => lead.estagio.tipo === "GANHO");
  const perdidos = leads.filter((lead) => lead.estagio.tipo === "PERDIDO");
  const abertos = leads.filter((lead) => lead.estagio.tipo === "ABERTO");

  const totalGanhosValor = ganhos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);
  const totalPerdidosValor = perdidos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);
  const totalEmAbertoValor = abertos.reduce((acc, lead) => acc + lead.valor_consorcio, 0);

  const negociosPeriodoAtual = leads.filter((lead) => lead.criado_em >= inicioPeriodo);
  const negociosPeriodoAnterior = leads.filter((lead) => lead.criado_em >= inicioPeriodoAnterior && lead.criado_em < inicioPeriodo);
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

  const meses = Array.from({ length: 6 }).map((_, indice) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - indice), 1);
    return { chave: normalizarMes(data), label: data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), ganhos: 0, perdidos: 0, abertos: 0 };
  });

  for (const lead of leads) {
    const chave = normalizarMes(lead.criado_em);
    const alvo = meses.find((mes) => mes.chave === chave);
    if (!alvo) continue;
    if (lead.estagio.tipo === "GANHO") alvo.ganhos += 1;
    else if (lead.estagio.tipo === "PERDIDO") alvo.perdidos += 1;
    else alvo.abertos += 1;
  }

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
  };

  return NextResponse.json(response);
}
