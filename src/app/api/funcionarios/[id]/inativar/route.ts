import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  podeInativarComReatribuicao,
  respostaSemPermissao,
} from "@/lib/permissoes";
import { mensagemErroValidacao, schemaInativarFuncionario } from "@/lib/validacoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeInativarComReatribuicao(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;

  const body = await request.json();
  const validacao = schemaInativarFuncionario.safeParse(body);

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { id_funcionario_destino, observacao } = validacao.data;

  if (id_funcionario_destino === id) {
    return NextResponse.json({ erro: "Selecione um colaborador de destino diferente." }, { status: 400 });
  }

  const funcionarioOrigem = await prisma.funcionario.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    select: {
      id: true,
      nome: true,
      ativo: true,
    },
  });

  if (!funcionarioOrigem) {
    return NextResponse.json({ erro: "Funcionario nao encontrado." }, { status: 404 });
  }

  if (!funcionarioOrigem.ativo) {
    return NextResponse.json({ erro: "Funcionario ja esta inativo." }, { status: 400 });
  }

  const funcionarioDestino = await prisma.funcionario.findFirst({
    where: {
      id: id_funcionario_destino,
      id_empresa: auth.sessao.id_empresa,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!funcionarioDestino) {
    return NextResponse.json({ erro: "Colaborador de destino invalido ou inativo." }, { status: 400 });
  }

  const quantidadeLeads = await prisma.lead.count({
    where: {
      id_empresa: auth.sessao.id_empresa,
      id_funcionario: id,
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.updateMany({
        where: {
          id_empresa: auth.sessao.id_empresa,
          id_funcionario: id,
        },
        data: {
          id_funcionario: id_funcionario_destino,
        },
      });

      await tx.funcionario.delete({
        where: {
          id,
          id_empresa: auth.sessao.id_empresa,
        },
      });

      await tx.reatribuicaoFuncionario.create({
        data: {
          id_empresa: auth.sessao.id_empresa,
          id_funcionario_origem: id,
          id_funcionario_destino,
          quantidade_leads: quantidadeLeads,
          observacao,
          criado_por_tipo: auth.sessao.perfil,
          criado_por_id: auth.sessao.id_usuario,
        },
      });

      await tx.auditoriaEquipe.createMany({
        data: [
          {
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: id,
            acao: "DELETAR_FUNCIONARIO",
            valor_anterior: "ATIVO",
            valor_novo: "DELETADO",
            observacao,
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          },
          {
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: id,
            acao: "REATRIBUIR_LEADS_FUNCIONARIO",
            valor_anterior: funcionarioOrigem.nome,
            valor_novo: funcionarioDestino.nome,
            observacao: `Leads reatribuidos: ${quantidadeLeads}`,
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          },
        ],
      });
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao deletar funcionario." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leads_reatribuidos: quantidadeLeads });
}
