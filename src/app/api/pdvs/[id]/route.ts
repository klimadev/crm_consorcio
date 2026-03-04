import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";
import { esquemaAtualizarPdv, mensagemErroValidacao } from "@/lib/validacoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validacao = esquemaAtualizarPdv.safeParse(payload);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { id } = await params;
  const { nome, id_whatsapp_instancia } = validacao.data;

  if (id_whatsapp_instancia !== undefined && id_whatsapp_instancia !== null) {
    const instancia = await prisma.whatsappInstancia.findFirst({
      where: {
        id: id_whatsapp_instancia,
        id_empresa: auth.sessao.id_empresa,
      },
      select: { id: true },
    });

    if (!instancia) {
      return NextResponse.json({ erro: "Instancia WhatsApp invalida para a empresa." }, { status: 400 });
    }
  }

  const data: { nome?: string; id_whatsapp_instancia?: string | null } = {};
  if (nome !== undefined) data.nome = nome;
  if (id_whatsapp_instancia !== undefined) data.id_whatsapp_instancia = id_whatsapp_instancia;

  const atualizados = await prisma.pdv.updateMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
    data,
  });

  if (atualizados.count === 0) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const { id } = await params;

  const funcionariosVinculados = await prisma.funcionario.count({
    where: {
      id_empresa: auth.sessao.id_empresa,
      id_pdv: id,
    },
  });

  if (funcionariosVinculados > 0) {
    return NextResponse.json(
      { erro: "Nao e possivel excluir PDV com colaboradores vinculados. Realoque-os antes de excluir." },
      { status: 400 },
    );
  }

  const deletados = await prisma.pdv.deleteMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (deletados.count === 0) {
    return NextResponse.json({ erro: "PDV nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
