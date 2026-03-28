import { NextRequest, NextResponse } from "next/server";
import { ensureSqliteOptimizations, prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { deletarInstancia } from "@/lib/evolution-api";
import { esquemaAtualizarWhatsappInstancia } from "@/lib/validacoes";
import { notFound } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { validateBody } from "@/lib/api/route-validation";
import { withRetry } from "@/lib/api/retry";
import { sincronizarEstadoWhatsapp } from "@/lib/whatsapp-instance-state";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  await ensureSqliteOptimizations();

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
    // Tenta deletar na Evolution API (trata erro de "já deletada" internamente)
    await deletarInstancia(instancia.instance_name);
  } catch (erro) {
    // Log do erro mas continua para limpar banco local
    console.error("Erro ao deletar instância na Evolution API:", erro);
  }

  // Sempre executa o delete no banco, independente do resultado da Evolution
  // Isso evita desincronização quando a instância já foi deletada externamente
  try {
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
  } catch (erroDb) {
    console.error("Erro ao deletar instância do banco local:", erroDb);
    return handleRouteError(erroDb, "Erro ao excluir instância.", "Erro ao excluir instância WhatsApp do banco:");
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  await ensureSqliteOptimizations();

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
    await sincronizarEstadoWhatsapp(instancia);

    const atualizada = await prisma.whatsappInstancia.findUnique({
      where: { id: instancia.id },
    });

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
