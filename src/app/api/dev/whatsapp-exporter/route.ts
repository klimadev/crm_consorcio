import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaExportarWhatsapp } from "@/lib/validacoes";
import { prisma } from "@/lib/prisma";
import { buscarContatos, buscarMensagensPorChat } from "@/lib/evolution-api";
import type { EvolutionContato, EvolutionChatMessage } from "@/lib/evolution-api";

function formatarDumpWhatsapp(
  instanceLabel: string,
  contatos: EvolutionContato[],
  mensagensPorChat: Map<string, EvolutionChatMessage[]>,
): { dump: string; stats: { chats: number; mensagens: number; periodoInicio: string; periodoFim: string } } {
  let totalMensagens = 0;
  let menorTimestamp = Infinity;
  let maiorTimestamp = -Infinity;

  const linhas: string[] = [];

  for (const contato of contatos) {
    const msgs = mensagensPorChat.get(contato.id);
    if (!msgs || msgs.length === 0) continue;

    const nome = contato.nome ?? contato.pushName ?? contato.remoteJidAlt ?? contato.id;
    const jid = contato.remoteJidAlt ?? contato.id;

    linhas.push("");
    linhas.push(`--- Chat: ${nome} | ${msgs.length} mensagens ---`);
    linhas.push("");

    for (const msg of msgs) {
      const data = new Date(msg.messageTimestamp * 1000);
      const dataStr = data.toISOString().replace("T", " ").slice(0, 19);
      const remetente = msg.fromMe ? "Eu" : (msg.pushName ?? contato.pushName ?? jid);
      const texto = msg.messageText ?? `[${msg.messageType}]`;

      linhas.push(`[${dataStr}] ${remetente}: ${texto}`);

      if (msg.messageTimestamp < menorTimestamp) menorTimestamp = msg.messageTimestamp;
      if (msg.messageTimestamp > maiorTimestamp) maiorTimestamp = msg.messageTimestamp;

      totalMensagens++;
    }
  }

  const inicio = menorTimestamp !== Infinity
    ? new Date(menorTimestamp * 1000).toISOString().replace("T", " ").slice(0, 19)
    : "N/A";
  const fim = maiorTimestamp !== -Infinity
    ? new Date(maiorTimestamp * 1000).toISOString().replace("T", " ").slice(0, 19)
    : "N/A";

  const header = [
    "=".repeat(60),
    "WHATSAPP CHAT HISTORY",
    "=".repeat(60),
    `Instancia: ${instanceLabel}`,
    `Exportado: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    `Chats: ${contatos.length}  |  Mensagens: ${totalMensagens}  |  Periodo: ${inicio} a ${fim}`,
    "=".repeat(60),
    "",
  ];

  const dump = header.join("\n") + linhas.join("\n");

  return {
    dump,
    stats: {
      chats: contatos.length,
      mensagens: totalMensagens,
      periodoInicio: inicio,
      periodoFim: fim,
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const validacao = esquemaExportarWhatsapp.safeParse(body);
  if (!validacao.success) {
    const mensagens = validacao.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ erro: mensagens }, { status: 400 });
  }

  const { instanceIds, chatLimit, messagesPerChat } = validacao.data;
  const sessao = auth.sessao;

  const instancias = await prisma.whatsappInstancia.findMany({
    where: {
      id: { in: instanceIds },
      id_empresa: sessao.id_empresa,
    },
    include: {
      pdvs: { select: { id: true } },
    },
  });

  if (instancias.length === 0) {
    return NextResponse.json({ erro: "Nenhuma instancia encontrada." }, { status: 404 });
  }

  const instanciasPermitidas = instancias.filter((inst) => {
    if (sessao.perfil === "EMPRESA") return true;

    if (sessao.id_pdv) {
      return inst.pdvs.some((pdv) => pdv.id === sessao.id_pdv);
    }

    return false;
  });

  if (instanciasPermitidas.length === 0) {
    return NextResponse.json({ erro: "Voce nao tem acesso a nenhuma das instancias selecionadas." }, { status: 403 });
  }

  const resultados: Array<{
    instanceId: string;
    instanceName: string;
    instanceLabel: string;
    status: "sucesso" | "erro";
    dump: string | null;
    stats: { chats: number; mensagens: number; periodoInicio: string; periodoFim: string } | null;
    erro: string | null;
  }> = [];

  for (const inst of instanciasPermitidas) {
    try {
      const contatos = await buscarContatos(inst.instance_name);
      const contatosFiltrados = contatos.slice(0, chatLimit);

      const mensagensPorChat = new Map<string, EvolutionChatMessage[]>();

      for (const contato of contatosFiltrados) {
        const jid = contato.remoteJidAlt ?? contato.id;
        try {
          const msgs = await buscarMensagensPorChat(inst.instance_name, jid, messagesPerChat);
          mensagensPorChat.set(contato.id, msgs);
        } catch (erro) {
          console.error(`Erro ao buscar mensagens do chat ${jid}:`, erro);
          mensagensPorChat.set(contato.id, []);
        }
      }

      const { dump, stats } = formatarDumpWhatsapp(
        inst.profile_name ?? inst.nome,
        contatosFiltrados,
        mensagensPorChat,
      );

      resultados.push({
        instanceId: inst.id,
        instanceName: inst.instance_name,
        instanceLabel: inst.profile_name ?? inst.nome,
        status: "sucesso",
        dump,
        stats,
        erro: null,
      });
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "Erro desconhecido ao exportar";
      console.error(`Erro ao exportar instancia ${inst.instance_name}:`, erro);

      resultados.push({
        instanceId: inst.id,
        instanceName: inst.instance_name,
        instanceLabel: inst.profile_name ?? inst.nome,
        status: "erro",
        dump: null,
        stats: null,
        erro: mensagem,
      });
    }
  }

  return NextResponse.json({ resultados });
}
