import { NextRequest, NextResponse } from "next/server";
import { withSessao } from "@/lib/api/route-guards";
import { ok } from "@/lib/api/http";
import { obterSnapshotConversas } from "@/lib/whatsapp-chat-realtime";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }): Promise<NextResponse> => {
    const busca = request.nextUrl.searchParams.get("busca")?.trim() ?? "";
    const cursor = request.nextUrl.searchParams.get("cursor")?.trim() ?? null;
    const limite = Math.min(Number(request.nextUrl.searchParams.get("limite") ?? 30), 50);
    const apenasNaoLidas = request.nextUrl.searchParams.get("naoLidas") === "true";

    try {
      const snapshot = await obterSnapshotConversas(sessao, {
        busca,
        cursor,
        limite,
        naoLidas: apenasNaoLidas,
      });

      return ok(snapshot);
    } catch (erro) {
      const detalhe = erro instanceof Error
        ? { mensagem: erro.message, stack: erro.stack, nome: erro.name }
        : { erro: String(erro) };

      console.error("[conversations] ERRO DETALHADO:", JSON.stringify(detalhe, null, 2));

      return NextResponse.json(
        {
          erro: "Erro ao carregar conversas.",
          debug: detalhe,
        },
        { status: 500 }
      );
    }
  });
}
