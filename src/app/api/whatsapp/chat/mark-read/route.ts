import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { ok, badRequest, notFound } from "@/lib/api/http";
import { esquemaWhatsappChatMarkRead } from "@/lib/validacoes";
import {
  buscarLeadComAcesso,
  marcarMensagensComoLidasEvolution,
  resolverInstanciaDoLead,
} from "@/lib/whatsapp-chat";

export async function POST(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const validacao = validateBody(esquemaWhatsappChatMarkRead, parseResult.data);
    if (!validacao.ok) return validacao.response;

    const lead = await buscarLeadComAcesso(sessao, validacao.data.leadId);
    if (!lead) {
      return notFound("Lead nao encontrado.");
    }

    const instancia = await resolverInstanciaDoLead(sessao.id_empresa, lead.id);
    if (!instancia) {
      return badRequest("Lead sem instancia WhatsApp configurada no PDV.");
    }

    const mensagensNaoLidas = await prisma.whatsappMensagem.findMany({
      where: {
        id_empresa: sessao.id_empresa,
        id_lead: lead.id,
        id_whatsapp_instancia: instancia.id,
        from_me: false,
        lida_no_crm_em: null,
      },
      select: { id: true, remote_jid: true, mensagem_id: true },
    });

    const agora = new Date();
    await prisma.whatsappMensagem.updateMany({
      where: {
        id_empresa: sessao.id_empresa,
        id_lead: lead.id,
        id_whatsapp_instancia: instancia.id,
        from_me: false,
        lida_no_crm_em: null,
      },
      data: {
        lida_no_crm_em: agora,
      },
    });

    if (mensagensNaoLidas.length > 0) {
      await marcarMensagensComoLidasEvolution(
        instancia.instanceName,
        mensagensNaoLidas.map((mensagem: { remote_jid: string; mensagem_id: string }) => ({
          remoteJid: mensagem.remote_jid,
          id: mensagem.mensagem_id,
        })),
      );
    }

    const unreadCount = await prisma.whatsappMensagem.count({
      where: {
        id_empresa: sessao.id_empresa,
        id_lead: lead.id,
        id_whatsapp_instancia: instancia.id,
        from_me: false,
        lida_no_crm_em: null,
      },
    });

    return ok({ unreadCount });
  });
}
