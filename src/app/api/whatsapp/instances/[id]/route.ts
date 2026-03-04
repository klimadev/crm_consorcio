import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { deletarInstancia } from "@/lib/evolution-api";
import { esquemaAtualizarWhatsappInstancia, mensagemErroValidacao } from "@/lib/validacoes";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;

  const instancia = await prisma.whatsappInstancia.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Instância não encontrada ou acesso negado." }, { status: 404 });
  }

  try {
    await deletarInstancia(instancia.instance_name);

    await prisma.$transaction([
      prisma.pdv.updateMany({
        where: {
          id_empresa: auth.sessao.id_empresa,
          id_whatsapp_instancia: instancia.id,
        },
        data: { id_whatsapp_instancia: null },
      }),
      prisma.whatsappInstancia.delete({
        where: { id: instancia.id },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir instância WhatsApp:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao excluir instância." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;

  const instancia = await prisma.whatsappInstancia.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Instância não encontrada ou acesso negado." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { nome?: unknown } | null;

  if (body && body.nome !== undefined) {
    const validacao = esquemaAtualizarWhatsappInstancia.safeParse(body);
    if (!validacao.success) {
      return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
    }

    const atualizada = await prisma.whatsappInstancia.update({
      where: { id: instancia.id },
      data: { nome: validacao.data.nome },
    });

    return NextResponse.json({ instancia: atualizada });
  }

  try {
    const resposta = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
    });

    if (!resposta.ok) {
      const atualizada = await prisma.whatsappInstancia.update({
        where: { id: instancia.id },
        data: { status: "disconnected" },
      });
      return NextResponse.json({ instancia: atualizada });
    }

    const json = await resposta.json();
    const data = json.instance ?? json;
    const novoStatus = data.state ?? "unknown";
    const phone = data.owner?.replace("@s.whatsapp.net", "") ?? null;

    const atualizada = await prisma.whatsappInstancia.update({
      where: { id: instancia.id },
      data: {
        status: novoStatus,
        phone: phone,
      },
    });

    return NextResponse.json({ instancia: atualizada });
  } catch (erro) {
    console.error("Erro ao verificar status:", erro);
    const atualizada = await prisma.whatsappInstancia.update({
      where: { id: instancia.id },
      data: { status: "error" },
    });
    return NextResponse.json({ instancia: atualizada });
  }
}
