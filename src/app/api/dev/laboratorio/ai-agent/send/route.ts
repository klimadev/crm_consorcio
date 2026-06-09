import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { enviarMensagemTexto } from "@/lib/evolution-api";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;
  const sessao = auth.sessao;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const { instanceName, telefone, mensagem, leadName } = body as {
    instanceName?: string;
    telefone?: string;
    mensagem?: string;
    leadName?: string;
  };

  if (!instanceName || !telefone || !mensagem) {
    return NextResponse.json(
      { erro: "instanceName, telefone e mensagem sao obrigatorios." },
      { status: 400 },
    );
  }

  // Verify user has access to this instance
  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      instance_name: instanceName,
      id_empresa: sessao.id_empresa,
    },
  });

  if (!instancia) {
    return NextResponse.json(
      { erro: "Instancia nao encontrada ou sem acesso." },
      { status: 404 },
    );
  }

  try {
    await enviarMensagemTexto({
      instanceName,
      telefone,
      mensagem,
    });

    // Try to log the message (best-effort)
    try {
      const lead = await prisma.lead.findFirst({
        where: {
          telefone: { contains: telefone.replace(/\D/g, "").slice(-10) },
          id_empresa: sessao.id_empresa,
        },
      });

      if (lead) {
        await prisma.whatsappMensagem.create({
          data: {
            id_empresa: sessao.id_empresa,
            id_lead: lead.id,
            id_whatsapp_instancia: instancia.id,
            mensagem_id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            remote_jid: `${telefone.replace(/\D/g, "")}@s.whatsapp.net`,
            from_me: true,
            tipo: "text",
            conteudo: mensagem,
            status: "ENVIADO",
            timestamp: Math.floor(Date.now() / 1000),
          },
        });
      }
    } catch (logErr) {
      console.warn("Erro ao logar mensagem no banco:", logErr);
    }

    return NextResponse.json({
      sucesso: true,
      message: leadName
        ? `Mensagem enviada para ${leadName}`
        : `Mensagem enviada para ${telefone}`,
    });
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : "Erro ao enviar mensagem WhatsApp";
    console.error("Erro ao enviar follow-up:", erro);
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
