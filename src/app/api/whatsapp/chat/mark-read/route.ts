import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaWhatsappChatMarkRead, mensagemErroValidacao } from "@/lib/validacoes";
import {
  buscarLeadComAcesso,
  marcarMensagensComoLidasEvolution,
  resolverInstanciaDoLead,
} from "@/lib/whatsapp-chat";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validacao = esquemaWhatsappChatMarkRead.safeParse(payload);
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

  const mensagensNaoLidas = await prisma.whatsappMensagem.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
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
      id_empresa: auth.sessao.id_empresa,
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
      id_empresa: auth.sessao.id_empresa,
      id_lead: lead.id,
      id_whatsapp_instancia: instancia.id,
      from_me: false,
      lida_no_crm_em: null,
    },
  });

  return NextResponse.json({ unreadCount });
}
