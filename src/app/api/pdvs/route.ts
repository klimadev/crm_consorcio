import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";
import { esquemaCriarPdv, mensagemErroValidacao } from "@/lib/validacoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const pdvs = await prisma.pdv.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    select: {
      id: true,
      nome: true,
      id_whatsapp_instancia: true,
      whatsapp_instancia: {
        select: {
          id: true,
          nome: true,
          status: true,
        },
      },
      funcionarios: {
        where: {
          id_empresa: auth.sessao.id_empresa,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          cargo: true,
        },
        orderBy: { nome: "asc" },
      },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({ pdvs });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return NextResponse.json({ erro: "Somente EMPRESA pode alterar PDVs." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validacao = esquemaCriarPdv.safeParse(payload);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { nome, id_whatsapp_instancia } = validacao.data;

  if (id_whatsapp_instancia) {
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

  try {
    const pdv = await prisma.pdv.create({
      data: {
        nome,
        id_empresa: auth.sessao.id_empresa,
        id_whatsapp_instancia: id_whatsapp_instancia ?? null,
      },
    });

    return NextResponse.json({ pdv });
  } catch (erro) {
    console.error("Erro ao criar PDV:", erro);
    return NextResponse.json({ erro: "Erro ao criar PDV." }, { status: 500 });
  }
}
