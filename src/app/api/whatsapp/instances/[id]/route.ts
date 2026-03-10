import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { deletarInstancia } from "@/lib/evolution-api";
import { esquemaAtualizarWhatsappInstancia } from "@/lib/validacoes";
import { notFound } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { validateBody } from "@/lib/api/route-validation";
import { withRetry } from "@/lib/api/retry";

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
    return notFound("Instância não encontrada ou acesso negado.");
  }

  try {
    await deletarInstancia(instancia.instance_name);

    await withRetry(
      () =>
        prisma.$transaction([
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
        ]),
      { maxAttempts: 3, delayMs: 1000 }
    );

    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof Error && erro.message) {
      return NextResponse.json({ erro: erro.message }, { status: 500 });
    }
    return handleRouteError(erro, "Erro ao excluir instância.", "Erro ao excluir instância WhatsApp:");
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
    return notFound("Instância não encontrada ou acesso negado.");
  }

  const rawBody = await request.text();
  let body: { nome?: unknown } | null = null;
  if (rawBody) {
    try {
      body = (JSON.parse(rawBody) as { nome?: unknown } | null) ?? null;
    } catch {
      body = null;
    }
  }

  if (body && body.nome !== undefined) {
    const validacao = validateBody(esquemaAtualizarWhatsappInstancia, body);
    if (!validacao.ok) {
      return validacao.response;
    }

    const atualizada = await withRetry(
      () =>
        prisma.whatsappInstancia.update({
          where: { id: instancia.id },
          data: { nome: validacao.data.nome },
        }),
      { maxAttempts: 3, delayMs: 1000 }
    );

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
      const atualizada = await withRetry(
        () =>
          prisma.whatsappInstancia.update({
            where: { id: instancia.id },
            data: { status: "disconnected" },
          }),
        { maxAttempts: 3, delayMs: 1000 }
      );
      return NextResponse.json({ instancia: atualizada });
    }

    const json = await resposta.json();
    const data = json.instance ?? json;
    const novoStatus = data.state ?? "unknown";
    const phone = data.owner?.replace("@s.whatsapp.net", "") ?? null;

    const atualizada = await withRetry(
      () =>
        prisma.whatsappInstancia.update({
          where: { id: instancia.id },
          data: {
            status: novoStatus,
            phone: phone,
          },
        }),
      { maxAttempts: 3, delayMs: 1000 }
    );

    return NextResponse.json({ instancia: atualizada });
  } catch (erro) {
    console.error("Erro ao verificar status:", erro);
    const atualizada = await withRetry(
      () =>
        prisma.whatsappInstancia.update({
          where: { id: instancia.id },
          data: { status: "error" },
        }),
      { maxAttempts: 3, delayMs: 1000 }
    );
    return NextResponse.json({ instancia: atualizada });
  }
}
