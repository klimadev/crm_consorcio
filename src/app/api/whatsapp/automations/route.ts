import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaCriarAutomacaoWhatsapp, mensagemErroValidacao } from "@/lib/validacoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const automacoes = await prisma.whatsappAutomacao.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: { criado_em: "desc" },
  });

  return NextResponse.json({ automacoes });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = (await request.json()) as {
    id_whatsapp_instancia?: string;
    evento?: "LEAD_STAGE_CHANGED";
    id_estagio_destino?: string;
    telefone_destino?: string;
    mensagem?: string;
    ativo?: boolean;
  };

  const validacao = esquemaCriarAutomacaoWhatsapp.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dados = validacao.data;
  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      id: dados.id_whatsapp_instancia,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Instancia de WhatsApp invalida." }, { status: 400 });
  }

  if (dados.id_estagio_destino) {
    const estagio = await prisma.estagioFunil.findFirst({
      where: {
        id: dados.id_estagio_destino,
        id_empresa: auth.sessao.id_empresa,
      },
    });

    if (!estagio) {
      return NextResponse.json({ erro: "Estagio destino invalido." }, { status: 400 });
    }
  }

  const automacao = await prisma.whatsappAutomacao.create({
    data: {
      id_empresa: auth.sessao.id_empresa,
      id_whatsapp_instancia: dados.id_whatsapp_instancia,
      evento: dados.evento,
      id_estagio_destino: dados.id_estagio_destino?.trim() || null,
      telefone_destino: dados.telefone_destino,
      mensagem: dados.mensagem,
      ativo: dados.ativo ?? true,
    },
  });

  return NextResponse.json({ automacao }, { status: 201 });
}
