import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigeSessao } from "../permissoes";
import { esquemaAtualizarPendencia, mensagemErroValidacao } from "@/lib/validacoes";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await exigeSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  const body = (await request.json()) as {
    documento_url?: string | null;
    resolvida?: boolean;
  };

  const validacao = esquemaAtualizarPendencia.safeParse(body);

  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dadosValidados = validacao.data;

  // Verificar se a pendência existe e pertence à empresa
  const pendenciaExistente = await prisma.pendencia.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    include: { lead: true },
  });

  if (!pendenciaExistente) {
    return NextResponse.json({ erro: "Pendencia não encontrada." }, { status: 404 });
  }

  // Se for colaborador, verificar se o lead pertence a ele
  if (auth.sessao.perfil === "COLABORADOR" && pendenciaExistente.lead.id_funcionario !== auth.sessao.id_usuario) {
    return NextResponse.json({ erro: "Você não tem permissão para atualizar esta pendência." }, { status: 403 });
  }

  // Se está marcando como resolvida, adicionar data de resolução
  const dataAtualizacao: {
    documento_url?: string | null;
    resolvida?: boolean;
    resolvida_em?: Date | null;
  } = { ...dadosValidados };

  if (dadosValidados.resolvida === true && !pendenciaExistente.resolvida) {
    dataAtualizacao.resolvida_em = new Date();
  } else if (dadosValidados.resolvida === false) {
    dataAtualizacao.resolvida_em = null;
  }

  const pendencia = await prisma.pendencia.update({
    where: { id },
    data: dataAtualizacao,
  });

  return NextResponse.json({ pendencia });
}
