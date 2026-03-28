import { NextRequest } from "next/server";
import { withSessao } from "@/lib/api/route-guards";
import { validateQuery } from "@/lib/api/route-validation";
import { badRequest } from "@/lib/api/http";
import { esquemaWhatsappChatMessagesQuery } from "@/lib/validacoes";
import { buscarLeadComAcesso, resolverInstanciaDoLead } from "@/lib/whatsapp-chat";
import { criarChaveChatStream, criarRespostaSse, obterSnapshotMensagens } from "@/lib/whatsapp-chat-realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const validacao = validateQuery(esquemaWhatsappChatMessagesQuery, {
      leadId: request.nextUrl.searchParams.get("leadId") ?? "",
    });

    if (!validacao.ok) return validacao.response;

    const lead = await buscarLeadComAcesso(sessao, validacao.data.leadId);
    if (!lead) {
      return new Response(JSON.stringify({ erro: "Lead nao encontrado." }), { status: 404 });
    }

    const instancia = await resolverInstanciaDoLead(sessao.id_empresa, lead.id);
    if (!instancia) {
      return badRequest("Lead sem instancia WhatsApp configurada no PDV.");
    }

    return criarRespostaSse({
      tipo: "chat",
      chave: criarChaveChatStream(sessao.id_empresa, instancia.id, lead.id),
      pollMs: 10000,
      carregarSnapshot: () => obterSnapshotMensagens(sessao, lead.id),
    }, request);
  });
}
