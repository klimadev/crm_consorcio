import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { buscarContatos, buscarMensagensPorChat } from "@/lib/evolution-api";
import type { EvolutionContato, EvolutionChatMessage } from "@/lib/evolution-api";
import { generateObject } from "ai";
import { createAiProvider, getAiConfig } from "@/modules/laboratorio/ai-agent/lib/ai-client";
import { AnalysisResultSchema, AnalyzeRequestSchema } from "@/modules/laboratorio/ai-agent/types";
import { SYSTEM_PROMPT } from "@/modules/laboratorio/ai-agent/lib/prompts";

function formatarDumpWhatsapp(
  instanceLabel: string,
  contatos: EvolutionContato[],
  mensagensPorChat: Map<string, EvolutionChatMessage[]>,
): { dump: string; stats: { chats: number; mensagens: number } } {
  let totalMensagens = 0;

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
      totalMensagens++;
    }
  }

  const header = [
    "=".repeat(60),
    "WHATSAPP CHAT HISTORY",
    "=".repeat(60),
    `Instancia: ${instanceLabel}`,
    `Chats: ${contatos.length}  |  Mensagens: ${totalMensagens}`,
    "=".repeat(60),
    "",
  ];

  return {
    dump: header.join("\n") + linhas.join("\n"),
    stats: { chats: contatos.length, mensagens: totalMensagens },
  };
}

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

  const validacao = AnalyzeRequestSchema.safeParse(body);
  if (!validacao.success) {
    const mensagens = validacao.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ erro: mensagens }, { status: 400 });
  }

  const { instanceIds, chatLimit, messagesPerChat } = validacao.data;

  // Fetch instances and validate permissions
  const instancias = await prisma.whatsappInstancia.findMany({
    where: { id: { in: instanceIds }, id_empresa: sessao.id_empresa },
    include: { pdvs: { select: { id: true } } },
  });

  if (instancias.length === 0) {
    return NextResponse.json({ erro: "Nenhuma instancia encontrada." }, { status: 404 });
  }

  // Get AI provider config
  const aiConfig = await getAiConfig(sessao.id_empresa);
  if (!aiConfig.apiKey) {
    return NextResponse.json(
      { erro: "Provedor IA nao configurado. Configure um provider ou defina OPENAI_API_KEY no ambiente." },
      { status: 502 },
    );
  }

  // Build dump from all instances
  const dumps: string[] = [];

  for (const inst of instancias) {
    try {
      const contatos = await buscarContatos(inst.instance_name);
      const contatosFiltrados = contatos.slice(0, chatLimit);
      const mensagensPorChat = new Map<string, EvolutionChatMessage[]>();

      for (const contato of contatosFiltrados) {
        const jid = contato.remoteJidAlt ?? contato.id;
        try {
          const msgs = await buscarMensagensPorChat(inst.instance_name, jid, messagesPerChat);
          mensagensPorChat.set(contato.id, msgs);
        } catch {
          mensagensPorChat.set(contato.id, []);
        }
      }

      const { dump } = formatarDumpWhatsapp(
        inst.profile_name ?? inst.nome,
        contatosFiltrados,
        mensagensPorChat,
      );

      dumps.push(dump);
    } catch (erro) {
      console.error(`Erro ao processar instancia ${inst.instance_name}:`, erro);
      dumps.push(`\n[ERRO ao processar instancia ${inst.instance_name}]\n`);
    }
  }

  const dumpCompleto = dumps.join("\n\n");

  if (!dumpCompleto.trim() || dumpCompleto.includes("Nenhum chat encontrado")) {
    return NextResponse.json({
      analysis: [],
      summary: { totalLeads: 0, urgentes: 0, quentes: 0, frios: 0 },
      message: "Nenhuma conversa encontrada para analisar.",
    });
  }

  // Call AI SDK with structured output
  try {
    const model = createAiProvider({
      baseUrl: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });

    const result = await generateObject({
      model,
      schema: AnalysisResultSchema,
      system: SYSTEM_PROMPT,
      prompt: `Analise as seguintes conversas de WhatsApp e retorne um JSON estruturado com a análise de cada lead:\n\n${dumpCompleto}`,
      maxRetries: 2,
    });

    return NextResponse.json(result.object);
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : "Erro desconhecido";
    console.error("Erro na analise IA:", erro);

    // Detect common errors
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      return NextResponse.json(
        { erro: "Falha de autenticacao com o provider IA. Verifique sua API Key." },
        { status: 502 },
      );
    }
    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      return NextResponse.json(
        { erro: "Provider IA retornou limite de taxa (429). Aguarde e tente novamente." },
        { status: 502 },
      );
    }
    if (msg.includes("timeout") || msg.includes("TIMEOUT") || msg.includes("timed out")) {
      return NextResponse.json(
        { erro: "Tempo limite excedido na comunicacao com o provider IA." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { erro: `Erro na analise IA: ${msg}` },
      { status: 502 },
    );
  }
}
