import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaRedistribuirLeadsEmAtendimento, mensagemErroValidacao } from "@/lib/validacoes";
import { obterCargaAtualColaboradores, escolherMenosCarregado, proximoColaboradorRoundRobin } from "@/lib/distribuicao-leads";
import type { ColaboradorInfo, CargaLeadPorColaborador } from "@/lib/distribuicao-leads";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const payload = await request.json().catch(() => null);
  const validacao = esquemaRedistribuirLeadsEmAtendimento.safeParse(payload);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { modo, limite, id_pdv } = validacao.data;

  const filtroPdvSessao = auth.sessao.perfil === "GERENTE" ? auth.sessao.id_pdv : null;
  const idPdvEfetivo = filtroPdvSessao ?? id_pdv ?? null;

  const colaboradoresAtivos = await prisma.funcionario.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ativo: true,
      cargo: "COLABORADOR",
      ...(idPdvEfetivo ? { id_pdv: idPdvEfetivo } : {}),
    },
    select: { id: true, id_pdv: true, nome: true },
  });

  if (!colaboradoresAtivos.length) {
    return NextResponse.json({
      avaliados: 0,
      elegiveis: 0,
      reatribuidos: 0,
      ignoradosSemDestino: 0,
      detalhes: [],
    });
  }

  const colaboradoresPorPdv = new Map<string, ColaboradorInfo[]>();
  for (const colaborador of colaboradoresAtivos) {
    const listaAtual = colaboradoresPorPdv.get(colaborador.id_pdv) ?? [];
    listaAtual.push({ id: colaborador.id, nome: colaborador.nome });
    colaboradoresPorPdv.set(colaborador.id_pdv, listaAtual);
  }

  let whereLead: Record<string, unknown> = {
    id_empresa: auth.sessao.id_empresa,
    funcionario: {
      ativo: true,
      ...(idPdvEfetivo ? { id_pdv: idPdvEfetivo } : {}),
    },
  };

  if (modo === "indefinidos") {
    const estagioIndefinido = await prisma.estagioFunil.findFirst({
      where: {
        id_empresa: auth.sessao.id_empresa,
        nome: "Indefinido",
      },
      select: { id: true },
    });

    if (!estagioIndefinido) {
      return NextResponse.json({
        avaliados: 0,
        elegiveis: 0,
        reatribuidos: 0,
        ignoradosSemDestino: 0,
        detalhes: [],
      });
    }

    whereLead = {
      ...whereLead,
      id_estagio: estagioIndefinido.id,
    };
  } else if (modo === "parados") {
    const corteParado = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    whereLead = {
      ...whereLead,
      atualizado_em: { lte: corteParado },
      estagio: {
        tipo: { notIn: ["GANHO", "PERDIDO"] },
      },
    };
  }

  const leadsParaReatribuir = await prisma.lead.findMany({
    where: whereLead,
    include: {
      funcionario: {
        select: {
          id: true,
          id_pdv: true,
        },
      },
    },
    orderBy: { atualizado_em: "asc" },
    ...(limite !== undefined ? { take: limite } : {}),
  });

  const detalhes: Array<{ leadId: string; deFuncionarioId: string; paraFuncionarioId: string }> = [];
  let reatribuidos = 0;
  let ignoradosSemDestino = 0;

  const cargaPorPdvCache = new Map<string, CargaLeadPorColaborador>();
  const indicePorPdv = new Map<string, number>();

  for (const lead of leadsParaReatribuir) {
    const idPdvLead = lead.funcionario.id_pdv;
    const poolDoPdv = colaboradoresPorPdv.get(idPdvLead) ?? [];

    if (!poolDoPdv.length) {
      ignoradosSemDestino += 1;
      continue;
    }

    let novoFuncionarioId: string;

    if (modo === "indefinidos") {
      const indice = indicePorPdv.get(idPdvLead) ?? 0;
      const { colaborador, proximoIndice } = proximoColaboradorRoundRobin(poolDoPdv, indice);
      indicePorPdv.set(idPdvLead, proximoIndice);
      novoFuncionarioId = colaborador.id;
    } else {
      let cargaPdv = cargaPorPdvCache.get(idPdvLead);
      if (!cargaPdv) {
        const ids = poolDoPdv.map((c) => c.id);
        cargaPdv = await obterCargaAtualColaboradores(auth.sessao.id_empresa, ids);
        cargaPorPdvCache.set(idPdvLead, cargaPdv);
      }

      const melhor = escolherMenosCarregado(poolDoPdv, cargaPdv);
      if (!melhor) {
        ignoradosSemDestino += 1;
        continue;
      }

      novoFuncionarioId = melhor.id;

      if (novoFuncionarioId === lead.id_funcionario) {
        ignoradosSemDestino += 1;
        continue;
      }
    }

    const atualizado = await prisma.lead.updateMany({
      where: {
        id: lead.id,
        id_empresa: auth.sessao.id_empresa,
      },
      data: {
        id_funcionario: novoFuncionarioId,
      },
    });

    if (atualizado.count > 0) {
      reatribuidos += 1;
      detalhes.push({
        leadId: lead.id,
        deFuncionarioId: lead.id_funcionario,
        paraFuncionarioId: novoFuncionarioId,
      });

      if (modo !== "indefinidos") {
        const cargaPdv = cargaPorPdvCache.get(idPdvLead)!;
        const cargaAtual = cargaPdv.get(novoFuncionarioId) ?? 0;
        cargaPdv.set(novoFuncionarioId, cargaAtual + 1);
        const cargaAnterior = cargaPdv.get(lead.id_funcionario) ?? 1;
        cargaPdv.set(lead.id_funcionario, Math.max(0, cargaAnterior - 1));
      }
    }
  }

  return NextResponse.json({
    avaliados: leadsParaReatribuir.length,
    elegiveis: leadsParaReatribuir.length,
    reatribuidos,
    ignoradosSemDestino,
    detalhes,
  });
}
