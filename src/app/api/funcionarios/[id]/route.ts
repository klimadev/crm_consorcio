import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  podeEditarEquipe,
  podeEditarFuncionarioNoPdv,
  respostaSemPermissao,
} from "@/lib/permissoes";
import { schemaAtualizarFuncionario } from "@/lib/validacoes";
import { notFound, serverError } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeEditarEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(schemaAtualizarFuncionario, body.data);

  if (!validacao.ok) {
    return validacao.response;
  }

  const { nome, cargo, id_pdv } = validacao.data;
  const email = validacao.data.email ? validacao.data.email.toLowerCase() : undefined;

  const funcionarioAtual = await prisma.funcionario.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      id_pdv: true,
    },
  });

  if (!funcionarioAtual) {
    return notFound("Funcionario nao encontrado.");
  }

  if (
    !podeEditarFuncionarioNoPdv(
      auth.sessao,
      funcionarioAtual.id_pdv,
      funcionarioAtual.cargo,
      cargo,
      id_pdv,
    )
  ) {
    return NextResponse.json(
      { erro: "Sem permissao para editar este colaborador com os dados informados." },
      { status: 403 },
    );
  }

  const pdv = await prisma.pdv.findFirst({
    where: {
      id: id_pdv,
      id_empresa: auth.sessao.id_empresa,
    },
    select: { id: true },
  });

  if (!pdv) {
    return notFound("PDV nao encontrado.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.funcionario.updateMany({
        where: {
          id,
          id_empresa: auth.sessao.id_empresa,
        },
        data: {
          nome,
          ...(email ? { email } : {}),
          cargo,
          id_pdv,
        },
      });

      const auditorias = [
        { campo: "nome", anterior: funcionarioAtual.nome, novo: nome },
        ...(email ? [{ campo: "email", anterior: funcionarioAtual.email, novo: email }] : []),
        { campo: "cargo", anterior: funcionarioAtual.cargo, novo: cargo },
        { campo: "id_pdv", anterior: funcionarioAtual.id_pdv, novo: id_pdv },
      ].filter((item) => item.anterior !== item.novo);

      if (auditorias.length > 0) {
        await tx.auditoriaEquipe.createMany({
          data: auditorias.map((item) => ({
            id_empresa: auth.sessao.id_empresa,
            id_funcionario_alvo: id,
            acao: "ATUALIZAR_DADOS_FUNCIONARIO",
            campo: item.campo,
            valor_anterior: item.anterior,
            valor_novo: item.novo,
            autor_tipo: auth.sessao.perfil,
            autor_id: auth.sessao.id_usuario,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Erro ao atualizar funcionario.");
  }
}
