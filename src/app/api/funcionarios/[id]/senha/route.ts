import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  podeEditarEquipe,
  podeEditarFuncionarioNoPdv,
  respostaSemPermissao,
} from "@/lib/permissoes";
import { schemaAlterarSenhaFuncionario } from "@/lib/validacoes";
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

  const validacao = validateBody(schemaAlterarSenhaFuncionario, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const { senha } = validacao.data;

  const funcionarioAtual = await prisma.funcionario.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    select: {
      id: true,
      nome: true,
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
      funcionarioAtual.cargo,
      funcionarioAtual.id_pdv,
    )
  ) {
    return respostaSemPermissao();
  }

  try {
    const senha_hash = await bcrypt.hash(senha, 10);

    await prisma.$transaction(async (tx) => {
      await tx.funcionario.updateMany({
        where: {
          id,
          id_empresa: auth.sessao.id_empresa,
        },
        data: {
          senha_hash,
        },
      });

      await tx.auditoriaEquipe.create({
        data: {
          id_empresa: auth.sessao.id_empresa,
          id_funcionario_alvo: id,
          acao: "REDEFINIR_SENHA",
          campo: "senha_hash",
          valor_anterior: "[oculto]",
          valor_novo: "[redefinida]",
          autor_tipo: auth.sessao.perfil,
          autor_id: auth.sessao.id_usuario,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Erro ao redefinir senha.");
  }
}
