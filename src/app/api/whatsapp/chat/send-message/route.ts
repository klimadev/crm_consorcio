import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaWhatsappChatSendMessage, mensagemErroValidacao } from "@/lib/validacoes";
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
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validacao = esquemaWhatsappChatSendMessage.safeParse(payload);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const { leadId, text, clientTempId } = validacao.data;
  const lead = await buscarLeadComAcesso(auth.sessao, leadId);
  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  const jidInfo = normalizarRemoteJidParaLead(lead.telefone);
  if (!jidInfo.ok) {
    return NextResponse.json({ erro: jidInfo.erro }, { status: 400 });
  }

  const instancia = await resolverInstanciaDoLead(auth.sessao.id_empresa, lead.id);
  if (!instancia) {
    return NextResponse.json({ erro: "Lead sem instancia WhatsApp configurada no PDV." }, { status: 409 });
  }

  const connectionStatus = await buscarConnectionStatus(instancia.instanceName);
  if (connectionStatus !== "online") {
    return NextResponse.json({ erro: "WhatsApp desconectado." }, { status: 409 });
  }

  try {
    const sendResponse = await enviarMensagemEvolution(instancia.instanceName, jidInfo.waNumber, text);
    const normalizadas = normalizarMensagensEvolution([sendResponse]);
    const mensagem = normalizadas[0];

    if (!mensagem) {
      return NextResponse.json({ erro: "Resposta invalida da Evolution API." }, { status: 502 });
    }

    await prisma.$transaction(async (tx) => {
      await upsertMensagensNoBanco(tx, {
        idEmpresa: auth.sessao.id_empresa,
        idLead: lead.id,
        idWhatsappInstancia: instancia.id,
        mensagens: [mensagem],
      });
    });

    const persisted = await prisma.whatsappMensagem.findFirst({
      where: {
        id_empresa: auth.sessao.id_empresa,
        id_lead: lead.id,
        id_whatsapp_instancia: instancia.id,
        mensagem_id: mensagem.messageId,
      },
      orderBy: { criado_em: "desc" },
    });

    if (!persisted) {
      return NextResponse.json({ erro: "Nao foi possivel persistir a mensagem." }, { status: 500 });
    }

    return NextResponse.json({ message: mapearMensagemDbParaCanonica(persisted), clientTempId });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao enviar mensagem." },
      { status: 500 },
    );
  }
}
