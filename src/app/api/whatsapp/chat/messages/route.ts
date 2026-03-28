import { NextRequest, NextResponse } from "next/server";
import { withSessao } from "@/lib/api/route-guards";
import { validateQuery } from "@/lib/api/route-validation";
import { ok, badRequest } from "@/lib/api/http";
import { esquemaWhatsappChatMessagesQuery } from "@/lib/validacoes";
import { obterSnapshotMensagens } from "@/lib/whatsapp-chat-realtime";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }): Promise<NextResponse> => {
    const validacao = validateQuery(esquemaWhatsappChatMessagesQuery, {
      leadId: request.nextUrl.searchParams.get("leadId") ?? "",
    });
    if (!validacao.ok) return validacao.response;

    try {
      const snapshot = await obterSnapshotMensagens(sessao, validacao.data.leadId);
      return ok(snapshot);
    } catch (erro) {
      const erroTipado = erro as Error & {
        codigo?: string;
        pdv?: { id: string; nome: string } | null;
        rotaConfiguracao?: string | null;
      };

      if (erroTipado.codigo === "PDV_SEM_INSTANCIA") {
        return NextResponse.json(
          {
            erro: erroTipado.message,
            codigo: erroTipado.codigo,
            pdv: erroTipado.pdv ?? null,
            rotaConfiguracao: erroTipado.rotaConfiguracao ?? null,
          },
          { status: 409 },
        );
      }

      if (erroTipado.message === "Lead nao encontrado.") {
        return NextResponse.json({ erro: erroTipado.message }, { status: 404 });
      }

      return badRequest(erroTipado.message || "Erro ao carregar mensagens.");
    }
  });
}
