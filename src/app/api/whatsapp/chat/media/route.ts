import { NextRequest, NextResponse } from "next/server";
import { withSessao } from "@/lib/api/route-guards";
import { prisma } from "@/lib/prisma";
import { whereLeadsPorPerfil } from "@/lib/permissoes";
import { resolverInstanciaDoLead } from "@/lib/whatsapp-chat";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

function payloadHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: EVOLUTION_API_KEY,
  };
}

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }): Promise<NextResponse> => {
    try {
      const leadId = request.nextUrl.searchParams.get("leadId");
      const messageId = request.nextUrl.searchParams.get("messageId");

      if (!leadId || !messageId) {
        return NextResponse.json({ erro: "leadId e messageId são obrigatórios" }, { status: 400 });
      }

      const whereLeads = await whereLeadsPorPerfil(sessao);
      const lead = await prisma.lead.findFirst({
        where: {
          ...whereLeads,
          id: leadId,
        },
        select: {
          id: true,
          id_empresa: true,
        },
      });

      if (!lead) {
        return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
      }

      const instancia = await resolverInstanciaDoLead(lead.id_empresa, leadId);
      if (!instancia) {
        return NextResponse.json({ erro: "Instância do WhatsApp não encontrada", codigo: "PDV_SEM_INSTANCIA" }, { status: 409 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instancia.instanceName}`,
        {
          method: "POST",
          headers: payloadHeaders(),
          body: JSON.stringify({
            message: {
              key: {
                id: messageId,
              },
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.error("[buscarMediaBase64] Erro ao buscar mídia:", response.status);
        return NextResponse.json({ erro: "Erro ao buscar mídia ou mídia não encontrada" }, { status: 400 });
      }

      const json = await response.json().catch(() => null);
      if (!json || !json.base64) {
        return NextResponse.json({ erro: "Mídia não encontrada" }, { status: 404 });
      }

      return NextResponse.json({
        media: {
          base64: json.base64,
          mediaType: json.mediaType ?? "audio",
          mimetype: json.mimetype ?? "audio/ogg",
          fileName: json.fileName ?? "audio",
          seconds: json.seconds ?? null,
        },
      });
    } catch (erro) {
      console.error("Erro ao buscar mídia de áudio:", erro);
      const mensagem = erro instanceof Error && erro.name === "AbortError" 
        ? "Tempo limite excedido" 
        : "Erro ao buscar áudio";
      return NextResponse.json({ erro: mensagem }, { status: 500 });
    }
  });
}