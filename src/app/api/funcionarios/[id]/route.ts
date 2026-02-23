import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeEditarEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { mensagemErroValidacao, schemaAtualizarFuncionario } from "@/lib/validacoes";

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
  const body = await request.json();
  const validacao = schemaAtualizarFuncionario.safeParse(body);

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { nome, cargo, id_pdv } = validacao.data;
  const email = validacao.data.email.toLowerCase();

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
    return NextResponse.json({ erro: "Funcionario nao encontrado." }, { status: 404 });
  }

  const pdv = await prisma.pdv.findFirst({
    where: {
      id: id_pdv,
      id_empresa: auth.sessao.id_empresa,
    },
    select: { id: true },
  });

  if (!pdv) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
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
          email,
          cargo,
          id_pdv,
        },
      });

      const auditorias = [
        { campo: "nome", anterior: funcionarioAtual.nome, novo: nome },
        { campo: "email", anterior: funcionarioAtual.email, novo: email },
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
    return NextResponse.json({ erro: "Erro ao atualizar funcionario." }, { status: 500 });
  }
}
