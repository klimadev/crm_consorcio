import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaRedistribuirLeadsEmAtendimento, mensagemErroValidacao } from "@/lib/validacoes";

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

  const { minutosSemAtendimento, limite, id_pdv, nomeEstagio } = validacao.data;
  const agora = new Date();
  const corteInatividade = new Date(agora.getTime() - minutosSemAtendimento * 60 * 1000);

  const filtroPdvSessao = auth.sessao.perfil === "GERENTE" ? auth.sessao.id_pdv : null;
  const idPdvEfetivo = filtroPdvSessao ?? id_pdv ?? null;

  const nomeEstagioEfetivo = nomeEstagio?.trim() || "Em Atendimento";

  const estagioEmAtendimento = await prisma.estagioFunil.findFirst({
    where: {
      id_empresa: auth.sessao.id_empresa,
      nome: nomeEstagioEfetivo,
      tipo: "ABERTO",
    },
    select: { id: true },
  });

  if (!estagioEmAtendimento) {
    return NextResponse.json({ erro: `Estagio '${nomeEstagioEfetivo}' nao encontrado.` }, { status: 400 });
  }

  const colaboradoresAtivos = await prisma.funcionario.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ativo: true,
      cargo: "COLABORADOR",
      ...(idPdvEfetivo ? { id_pdv: idPdvEfetivo } : {}),
    },
    select: { id: true, id_pdv: true },
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

  const colaboradoresPorPdv = new Map<string, string[]>();
  for (const colaborador of colaboradoresAtivos) {
    const listaAtual = colaboradoresPorPdv.get(colaborador.id_pdv) ?? [];
    listaAtual.push(colaborador.id);
    colaboradoresPorPdv.set(colaborador.id_pdv, listaAtual);
  }

  const leadsEmAtendimento = await prisma.lead.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      id_estagio: estagioEmAtendimento.id,
      atualizado_em: { lte: corteInatividade },
      funcionario: {
        ativo: true,
        ...(idPdvEfetivo ? { id_pdv: idPdvEfetivo } : {}),
      },
    },
    include: {
      funcionario: {
        select: {
          id: true,
          id_pdv: true,
        },
      },
    },
    orderBy: { atualizado_em: "asc" },
    take: limite,
  });

  const detalhes: Array<{ leadId: string; deFuncionarioId: string; paraFuncionarioId: string }> = [];
  let reatribuidos = 0;
  let ignoradosSemDestino = 0;

  for (const lead of leadsEmAtendimento) {
    const poolDoPdv = colaboradoresPorPdv.get(lead.funcionario.id_pdv) ?? [];
    const destinos = poolDoPdv.filter((idFuncionario) => idFuncionario !== lead.id_funcionario);

    if (!destinos.length) {
      ignoradosSemDestino += 1;
      continue;
    }

    const indiceDestino = Math.floor(Math.random() * destinos.length);
    const novoFuncionarioId = destinos[indiceDestino];

    const atualizado = await prisma.lead.updateMany({
      where: {
        id: lead.id,
        id_empresa: auth.sessao.id_empresa,
        id_estagio: estagioEmAtendimento.id,
        id_funcionario: lead.id_funcionario,
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
    }
  }

  return NextResponse.json({
    avaliados: leadsEmAtendimento.length,
    elegiveis: leadsEmAtendimento.length,
    reatribuidos,
    ignoradosSemDestino,
    detalhes,
  });
}
