import { NextRequest } from "next/server";
import { withSessao } from "@/lib/api/route-guards";
import { criarChaveConversasStream, criarRespostaSse, obterSnapshotConversas } from "@/lib/whatsapp-chat-realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const busca = request.nextUrl.searchParams.get("busca")?.trim() ?? "";
    const limite = Math.min(Number(request.nextUrl.searchParams.get("limite") ?? 30), 50);
    const naoLidas = request.nextUrl.searchParams.get("naoLidas") === "true";

    return criarRespostaSse({
      tipo: "conversations",
      chave: criarChaveConversasStream(sessao.id_empresa, busca, naoLidas, limite),
      pollMs: 10000,
      carregarSnapshot: () => obterSnapshotConversas(sessao, {
        busca,
        limite,
        naoLidas,
      }),
    }, request);
  });
}
