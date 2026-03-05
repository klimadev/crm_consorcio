import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { ok, badRequest, notFound, serverError, conflict } from "@/lib/api/http";
import { esquemaWhatsappChatSendMessage } from "@/lib/validacoes";
import {
  buscarConnectionStatus,
  buscarLeadComAcesso,
  enviarMensagemEvolution,
  mapearMensagemDbParaCanonica,
  normalizarMensagensEvolution,
  normalizarRemoteJidParaLead,
  resolverInstanciaDoLead,
  upsertMensagensNoBanco,
} from "@/lib/whatsapp-chat";

export async function POST(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const validacao = validateBody(esquemaWhatsappChatSendMessage, parseResult.data);
    if (!validacao.ok) return validacao.response;

    const { leadId, text, clientTempId } = validacao.data;
    const lead = await buscarLeadComAcesso(sessao, leadId);
    if (!lead) {
      return notFound("Lead nao encontrado.");
    }

    const jidInfo = normalizarRemoteJidParaLead(lead.telefone);
    if (!jidInfo.ok) {
      return badRequest(jidInfo.erro);
    }

    const instancia = await resolverInstanciaDoLead(sessao.id_empresa, lead.id);
    if (!instancia) {
      return conflict("Lead sem instancia WhatsApp configurada no PDV.");
    }

    const connectionStatus = await buscarConnectionStatus(instancia.instanceName);
    if (connectionStatus !== "online") {
      return conflict("WhatsApp desconectado.");
    }

    try {
      const sendResponse = await enviarMensagemEvolution(instancia.instanceName, jidInfo.waNumber, text);
      const normalizadas = normalizarMensagensEvolution([sendResponse]);
      const mensagem = normalizadas[0];

      if (!mensagem) {
        return serverError("Resposta invalida da Evolution API.");
      }

      await prisma.$transaction(async (tx) => {
        await upsertMensagensNoBanco(tx, {
          idEmpresa: sessao.id_empresa,
          idLead: lead.id,
          idWhatsappInstancia: instancia.id,
          mensagens: [mensagem],
        });
      });

      const persisted = await prisma.whatsappMensagem.findFirst({
        where: {
          id_empresa: sessao.id_empresa,
          id_lead: lead.id,
          id_whatsapp_instancia: instancia.id,
          mensagem_id: mensagem.messageId,
        },
        orderBy: { criado_em: "desc" },
      });

      if (!persisted) {
        return serverError("Nao foi possivel persistir a mensagem.");
      }

      return ok({ message: mapearMensagemDbParaCanonica(persisted), clientTempId });
    } catch (erro) {
      return serverError(erro instanceof Error ? erro.message : "Erro ao enviar mensagem.");
    }
  });
}
