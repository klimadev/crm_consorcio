import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaAtualizarLead, mensagemErroValidacao } from "@/lib/validacoes";


type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = await request.json();
  const validacao = esquemaAtualizarLead.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dadosValidados = validacao.data;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {} // GERENTE pode ver todos do PDV, validado abaixo
          : {}),
    },
    include: { funcionario: { select: { id_pdv: true } } },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode editar leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  let idFuncionarioDestino = dadosValidados.id_funcionario;

  if (auth.sessao.perfil === "COLABORADOR") {
    idFuncionarioDestino = auth.sessao.id_usuario;
  }

  if (idFuncionarioDestino && idFuncionarioDestino !== lead.id_funcionario) {
    const funcionarioDestino = await prisma.funcionario.findFirst({
      where: {
        id: idFuncionarioDestino,
        id_empresa: auth.sessao.id_empresa,
        ativo: true,
      },
      select: { id: true, id_pdv: true },
    });

    if (!funcionarioDestino) {
      return NextResponse.json({ erro: "Funcionario invalido." }, { status: 400 });
    }

    if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv && funcionarioDestino.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode transferir para funcionarios do seu PDV." },
        { status: 403 }
      );
    }
  }

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: dadosValidados.observacoes,
      telefone: dadosValidados.telefone,
      valor_consorcio: dadosValidados.valor_consorcio,
      motivo_perda: dadosValidados.motivo_perda,
      documento_aprovacao_url: dadosValidados.documento_aprovacao_url ?? undefined,
      id_funcionario: idFuncionarioDestino,
    },
  });

  return NextResponse.json({ lead: atualizado });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
          ? {} // GERENTE pode ver todos do PDV, validado abaixo
          : {}),
    },
    include: { funcionario: { select: { id_pdv: true } } },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode excluir leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return NextResponse.json({ sucesso: true });
}
