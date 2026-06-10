import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { buscarContatos, buscarMensagensPorChat } from "@/lib/evolution-api";
import type { EvolutionContato, EvolutionChatMessage } from "@/lib/evolution-api";
import { callAiText, getAiConfig } from "@/modules/laboratorio/ai-agent/lib/ai-client";
import { extractJson } from "@/modules/laboratorio/ai-agent/lib/extract-json";
import {
  AnalysisResultSchema,
  AnalyzeRequestSchema,
  type AnalysisResult,
} from "@/modules/laboratorio/ai-agent/types";
import { SYSTEM_PROMPT } from "@/modules/laboratorio/ai-agent/lib/prompts";

const BATCH_SIZE = 250;

interface ChatItem {
  instanceName: string;
  contato: EvolutionContato;
  mensagens: EvolutionChatMessage[];
}

function formatarDumpWhatsapp(
  instanceLabel: string,
  chats: ChatItem[],
): string {
  let totalMensagens = 0;
  const linhas: string[] = [];

  for (const chat of chats) {
    const { contato, mensagens } = chat;
    if (!mensagens || mensagens.length === 0) continue;

    const nome = contato.nome || contato.pushName || contato.remoteJidAlt || contato.id;
    const jid = contato.remoteJidAlt || contato.id;

    linhas.push("");
    linhas.push(`--- Chat: ${nome} (${mensagens.length} mensagens) ---`);
    linhas.push("");

    for (const msg of mensagens) {
      const data = new Date((msg.messageTimestamp || 0) * 1000);
      const dataStr = data.toISOString().replace("T", " ").slice(0, 19);
      const remetente = msg.fromMe ? "Eu" : (msg.pushName || contato.pushName || jid);
      const texto = msg.messageText || `[${msg.messageType}]`;

      linhas.push(`[${dataStr}] ${remetente}: ${texto}`);
      totalMensagens++;
    }
  }

  const header = [
    "=".repeat(60),
    "WHATSAPP CHAT HISTORY",
    "=".repeat(60),
    `Instancia: ${instanceLabel}`,
    `Chats: ${chats.length} | Mensagens: ${totalMensagens}`,
    "=".repeat(60),
    "",
  ];

  return header.join("\n") + linhas.join("\n");
}

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

function mergeResults(accumulator: AnalysisResult, batchResult: AnalysisResult): AnalysisResult {
  const somaSummary = (campo: "totalLeads" | "urgentes" | "quentes" | "frios") =>
    (accumulator.summary?.[campo] || 0) + (batchResult.summary?.[campo] || 0);

  return {
    analysis: [...(accumulator.analysis || []), ...(batchResult.analysis || [])],
    summary: {
      totalLeads: somaSummary("totalLeads"),
      urgentes: somaSummary("urgentes"),
      quentes: somaSummary("quentes"),
      frios: somaSummary("frios"),
      potencialFaturamento: (accumulator.summary?.potencialFaturamento || 0) + (batchResult.summary?.potencialFaturamento || 0),
      totalConversas: (accumulator.summary?.totalConversas || 0) + (batchResult.summary?.totalConversas || 0),
      totalBatches: batchResult.summary?.totalBatches || 1,
      batchesProcessados: (accumulator.summary?.batchesProcessados || 0) + (batchResult.summary?.batchesProcessados || 0),
      batchesComErro: accumulator.summary?.batchesComErro || 0,
    },
    warnings: [...(accumulator.warnings || [])],
  };
}

function computePotencialFaturamento(batch: AnalysisResult): number {
  return batch.analysis.reduce((sum, l) => sum + (l.valorCarta || 0), 0);
}

async function processBatch(
  controller: ReadableStreamDefaultController,
  aiConfig: { baseUrl: string; apiKey: string; model: string },
  chats: ChatItem[],
  instanceLabel: string,
  batchIndex: number,
  totalBatches: number,
): Promise<{ result: AnalysisResult | null; error: string | null }> {
  const dump = formatarDumpWhatsapp(instanceLabel, chats);

  if (!dump.trim()) {
    return { result: null, error: "Nenhuma conversa no lote" };
  }

  try {
    const text = await callAiText(
      {
        baseUrl: aiConfig.baseUrl,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
      },
      SYSTEM_PROMPT,
      `Analise as seguintes conversas de WhatsApp e retorne JSON estruturado com a análise de cada lead:\n\n${dump}`,
      { reasoningEffort: "low" },
    );

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      const preview = text.slice(0, 2000);
      sendEvent(controller, "batch_error", {
        batch: batchIndex,
        erro: "Resposta não contém JSON válido",
        preview: preview,
      });
      return { result: null, error: "Resposta não contém JSON válido" };
    }

    const validacao = AnalysisResultSchema.safeParse(parsed);
    if (!validacao.success) {
      const issues = JSON.stringify(validacao.error.issues).slice(0, 2000);
      sendEvent(controller, "batch_error", {
        batch: batchIndex,
        erro: "Schema validation failed",
        issues: issues,
      });
      return { result: null, error: `Schema validation failed: ${issues.slice(0, 500)}` };
    }

    let batchResult = validacao.data;

    // Calculate potential revenue from ALL leads (including cold) before filtering
    const potencial = computePotencialFaturamento(batchResult);

    // Filter out cold leads from analysis array per user request
    const coldCount = batchResult.analysis.filter((l) => l.sentiment === "FRIO").length;
    batchResult.analysis = batchResult.analysis.filter((l) => l.sentiment !== "FRIO");
    batchResult.summary.frios = coldCount;

    // Override calculated fields
    batchResult = {
      ...batchResult,
      summary: {
        ...batchResult.summary,
        potencialFaturamento: potencial,
        totalConversas: chats.length,
        totalBatches,
        batchesProcessados: 1,
        batchesComErro: 0,
      },
    };

    return { result: batchResult, error: null };
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : "Erro desconhecido";
    sendEvent(controller, "batch_error", {
      batch: batchIndex,
      erro: msg,
    });
    return { result: null, error: msg };
  }
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

  const instancias = await prisma.whatsappInstancia.findMany({
    where: {
      id: { in: instanceIds },
      id_empresa: sessao.id_empresa,
    },
    include: { pdvs: { select: { id: true } } },
  });

  if (instancias.length === 0) {
    return NextResponse.json({ erro: "Nenhuma instancia encontrada." }, { status: 404 });
  }

  const aiConfig = await getAiConfig(sessao.id_empresa);
  if (!aiConfig.apiKey) {
    return NextResponse.json(
      { erro: "Provedor nao configurado. Configure o provider ou defina OPENAI_API_KEY no ambiente." },
      { status: 502 },
    );
  }

  // Collect all chats across all instances
  const allChats: ChatItem[] = [];

  for (const inst of instancias) {
    try {
      const contatos = await buscarContatos(inst.instance_name);
      const contatosFiltrados = contatos.slice(0, chatLimit);

      for (const contato of contatosFiltrados) {
        const jid = contato.remoteJidAlt || contato.id;
        try {
          const msgs = await buscarMensagensPorChat(inst.instance_name, jid, messagesPerChat);
          allChats.push({
            instanceName: inst.profile_name || inst.nome,
            contato,
            mensagens: msgs,
          });
        } catch {
          allChats.push({
            instanceName: inst.profile_name || inst.nome,
            contato,
            mensagens: [],
          });
        }
      }
    } catch (erro) {
      console.error(`Erro ao processar instancia ${inst.instance_name}:`, erro);
    }
  }

  // Empty check
  if (allChats.length > 0 && !allChats.some((c) => c.mensagens.length > 0)) {
    return NextResponse.json({
      analysis: [],
      summary: {
        totalLeads: 0,
        urgentes: 0,
        quentes: 0,
        frios: 0,
        potencialFaturamento: 0,
        totalConversas: allChats.length,
        totalBatches: 0,
        batchesProcessados: 0,
        batchesComErro: 0,
      },
      message: "Nenhuma conversa encontrada para analisar.",
    });
  }

  if (allChats.length === 0) {
    return NextResponse.json({
      analysis: [],
      summary: {
        totalLeads: 0,
        urgentes: 0,
        quentes: 0,
        frios: 0,
        potencialFaturamento: 0,
        totalConversas: 0,
        totalBatches: 0,
        batchesProcessados: 0,
        batchesComErro: 0,
      },
      message: "Nenhuma conversa encontrada para analisar.",
    });
  }

  // Split into batches
  const batches: ChatItem[][] = [];
  for (let i = 0; i < allChats.length; i += BATCH_SIZE) {
    batches.push(allChats.slice(i, i + BATCH_SIZE));
  }

  const totalBatches = batches.length;
  const instanceLabel = instancias.map((i) => i.profile_name || i.nome).join(", ");

  // SSE Stream
  const stream = new ReadableStream({
    async start(controller) {
      let mergedResult: AnalysisResult = {
        analysis: [],
        summary: {
          totalLeads: 0,
          urgentes: 0,
          quentes: 0,
          frios: 0,
          potencialFaturamento: 0,
          totalConversas: 0,
          totalBatches,
          batchesProcessados: 0,
          batchesComErro: 0,
        },
        warnings: [],
      };

      for (let i = 0; i < batches.length; i++) {
        sendEvent(controller, "progress", {
          current: i + 1,
          total: totalBatches,
        });

        const { result, error } = await processBatch(
          controller,
          aiConfig,
          batches[i],
          instanceLabel,
          i + 1,
          totalBatches,
        );

        if (result) {
          mergedResult = mergeResults(mergedResult, result);
        } else if (error) {
          mergedResult.summary.batchesComErro++;
          if (!mergedResult.warnings) mergedResult.warnings = [];
          mergedResult.warnings.push({ batch: i + 1, erro: error });
        }
      }

      mergedResult.summary.batchesProcessados = totalBatches - mergedResult.summary.batchesComErro;

      sendEvent(controller, "complete", mergedResult);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
