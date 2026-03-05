import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { validateQuery } from "@/lib/api/route-validation";
import { ok, badRequest, notFound, conflict } from "@/lib/api/http";
import { esquemaWhatsappChatMessagesQuery } from "@/lib/validacoes";
import {
  buscarConnectionStatus,
  buscarLeadComAcesso,
  buscarMensagensEvolution,
  mapearMensagemDbParaCanonica,
  normalizarMensagensEvolution,
  normalizarRemoteJidParaLead,
  resolverInstanciaDoLead,
  upsertMensagensNoBanco,
} from "@/lib/whatsapp-chat";

const syncInFlight = new Set<string>();

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }) => {
    const validacao = validateQuery(esquemaWhatsappChatMessagesQuery, {
      leadId: request.nextUrl.searchParams.get("leadId") ?? "",
    });
    if (!validacao.ok) return validacao.response;

    const lead = await buscarLeadComAcesso(sessao, validacao.data.leadId);
    if (!lead) {
      return notFound("Lead nao encontrado.");
    }

    const instancia = await resolverInstanciaDoLead(sessao.id_empresa, lead.id);
    if (!instancia) {
      return conflict("Lead sem instancia WhatsApp configurada no PDV.");
    }

    const remoteJidInfo = normalizarRemoteJidParaLead(lead.telefone);
    if (!remoteJidInfo.ok) {
      return badRequest(remoteJidInfo.erro);
    }

    const [mensagensCache, unreadCount] = await Promise.all([
      prisma.whatsappMensagem.findMany({
        where: { id_empresa: sessao.id_empresa, id_lead: lead.id },
        orderBy: { timestamp: "asc" },
      }),
      prisma.whatsappMensagem.count({
        where: {
          id_empresa: sessao.id_empresa,
          id_lead: lead.id,
          from_me: false,
          lida_no_crm_em: null,
        },
      }),
    ]);

    let connectionStatus = "offline";
    if (instancia) {
      connectionStatus = await buscarConnectionStatus(instancia.instanceName);
      try {
        const payload = await buscarMensagensEvolution(instancia.instanceName, remoteJidInfo.remoteJid);

        const targetNumber = remoteJidInfo.waNumber.replace(/\D/g, "");

        const mensagensNormalizadas = normalizarMensagensEvolution(payload).filter((mensagem) => {
          const jidComparacao = mensagem.remoteJidAlt ?? mensagem.remoteJid;
          const msgNumber = jidComparacao.replace(/\D/g, "");
          return msgNumber.includes(targetNumber) || targetNumber.includes(msgNumber);
        });

        if (mensagensNormalizadas.length > 0) {
          const syncKey = `${sessao.id_empresa}:${lead.id}`;

          if (!syncInFlight.has(syncKey)) {
            syncInFlight.add(syncKey);
            try {
              await upsertMensagensNoBanco(prisma, {
                idEmpresa: sessao.id_empresa,
                idLead: lead.id,
                idWhatsappInstancia: instancia.id,
                mensagens: mensagensNormalizadas,
              });
            } finally {
              syncInFlight.delete(syncKey);
            }
          }

          const mensagensAtualizadas = await prisma.whatsappMensagem.findMany({
            where: { id_empresa: sessao.id_empresa, id_lead: lead.id },
            orderBy: { timestamp: "asc" },
          });

          return ok({
            messages: mensagensAtualizadas.map(mapearMensagemDbParaCanonica),
            connectionStatus,
            unreadCount,
          });
        }
      } catch (erro) {
        console.error("[messages] Erro ao buscar mensagens da Evolution API:", erro);
        connectionStatus = "offline";
      }
    }

    return ok({
      messages: mensagensCache.map(mapearMensagemDbParaCanonica),
      connectionStatus,
      unreadCount,
    });
  });
}
