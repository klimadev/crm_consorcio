import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaWhatsappChatMessagesQuery, mensagemErroValidacao } from "@/lib/validacoes";
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
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const validacao = esquemaWhatsappChatMessagesQuery.safeParse({
    leadId: request.nextUrl.searchParams.get("leadId") ?? "",
  });
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const lead = await buscarLeadComAcesso(auth.sessao, validacao.data.leadId);
  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  const instancia = await resolverInstanciaDoLead(auth.sessao.id_empresa, lead.id);
  if (!instancia) {
    return NextResponse.json({ erro: "Lead sem instancia WhatsApp configurada no PDV." }, { status: 409 });
  }

  const remoteJidInfo = normalizarRemoteJidParaLead(lead.telefone);
  if (!remoteJidInfo.ok) {
    return NextResponse.json({ erro: remoteJidInfo.erro }, { status: 400 });
  }

  const [mensagensCache, unreadCount] = await Promise.all([
    prisma.whatsappMensagem.findMany({
      where: { id_empresa: auth.sessao.id_empresa, id_lead: lead.id },
      orderBy: { timestamp: "asc" },
    }),
    prisma.whatsappMensagem.count({
      where: {
        id_empresa: auth.sessao.id_empresa,
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
        const syncKey = `${auth.sessao.id_empresa}:${lead.id}`;

        if (!syncInFlight.has(syncKey)) {
          syncInFlight.add(syncKey);
          try {
            await upsertMensagensNoBanco(prisma, {
              idEmpresa: auth.sessao.id_empresa,
              idLead: lead.id,
              idWhatsappInstancia: instancia.id,
              mensagens: mensagensNormalizadas,
            });
          } finally {
            syncInFlight.delete(syncKey);
          }
        }

        const mensagensAtualizadas = await prisma.whatsappMensagem.findMany({
          where: { id_empresa: auth.sessao.id_empresa, id_lead: lead.id },
          orderBy: { timestamp: "asc" },
        });

        return NextResponse.json({
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

  return NextResponse.json({
    messages: mensagensCache.map(mapearMensagemDbParaCanonica),
    connectionStatus,
    unreadCount,
  });
}
