import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaAtualizarLead } from "@/lib/validacoes";
import { badRequest, forbidden, notFound } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";


type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(esquemaAtualizarLead, body.data);
  if (!validacao.ok) {
    return validacao.response;
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
    return notFound("Lead nao encontrado.");
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
      return badRequest("Funcionario invalido.");
    }

    if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv && funcionarioDestino.id_pdv !== auth.sessao.id_pdv) {
      return forbidden("Voce só pode transferir para funcionarios do seu PDV.");
    }
  }

  const atualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      observacoes: dadosValidados.observacoes,
      telefone: dadosValidados.telefone,
      valor_consorcio: dadosValidados.valor_consorcio,
      motivo_perda: dadosValidados.motivo_perda,
      documento_aprovacao_url: dadosValidados.documento_aprovacao_url,
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
    return notFound("Lead nao encontrado.");
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return forbidden("Voce só pode excluir leads do seu PDV.");
    }
  }

  await prisma.lead.delete({
    where: { id: lead.id },
  });

  return NextResponse.json({ sucesso: true });
}
