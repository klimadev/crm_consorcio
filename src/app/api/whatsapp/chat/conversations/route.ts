import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { ok } from "@/lib/api/http";
import { formatarPreviewMensagem } from "@/lib/whatsapp-utils";

export async function GET(request: NextRequest) {
  return withSessao(request, async ({ sessao }): Promise<NextResponse> => {
    const busca = request.nextUrl.searchParams.get("busca")?.trim() ?? "";
    const cursor = request.nextUrl.searchParams.get("cursor")?.trim() ?? null;
    const limite = Math.min(Number(request.nextUrl.searchParams.get("limite") ?? 30), 50);
    const apenasNaoLidas = request.nextUrl.searchParams.get("naoLidas") === "true";

    try {
      // 1. Buscar lead IDs ordenados por última mensagem (mais recente primeiro)
      const condicaoBusca = busca
        ? Prisma.sql`AND (l.nome ILIKE ${"%" + busca + "%"} OR l.telefone LIKE ${"%" + busca + "%"})`
        : Prisma.empty;

      const condicaoCursor = cursor
        ? Prisma.sql`AND ultima_msg < (SELECT MAX(timestamp) FROM "WhatsappMensagem" WHERE id_lead = ${cursor})`
        : Prisma.empty;

      const condicaoNaoLidas = apenasNaoLidas
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM "WhatsappMensagem" wm2
            WHERE wm2.id_lead = l.id
            AND wm2.from_me = false
            AND wm2.lida_no_crm_em IS NULL
          )`
        : Prisma.empty;

      const leadsOrdenados = await prisma.$queryRaw<{ id: string }[]>`
        SELECT l.id
        FROM lead l
        INNER JOIN (
          SELECT id_lead, MAX(timestamp) as ultima_msg
          FROM "WhatsappMensagem"
          WHERE id_empresa = ${sessao.id_empresa}
          GROUP BY id_lead
        ) wm ON wm.id_lead = l.id
        WHERE l.id_empresa = ${sessao.id_empresa}
        ${condicaoBusca}
        ${condicaoCursor}
        ${condicaoNaoLidas}
        ORDER BY wm.ultima_msg DESC
        LIMIT ${limite + 1}
      `;

      const temMais = leadsOrdenados.length > limite;
      const idsPaginados = temMais ? leadsOrdenados.slice(0, limite) : leadsOrdenados;

      if (idsPaginados.length === 0) {
        return ok({ conversas: [], cursor: null, temMais: false });
      }

      const leadIds = idsPaginados.map((l) => l.id);

      // 2. Buscar dados completos dos leads (mantendo ordenação)
      const leads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: {
          id: true,
          nome: true,
          telefone: true,
          estagio: { select: { nome: true } },
          whatsapp_mensagens: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: {
              conteudo: true,
              from_me: true,
              tipo: true,
              timestamp: true,
            },
          },
        },
      });

      // Reordenar leads conforme ordem da query raw
      const mapaLeads = new Map(leads.map((l) => [l.id, l]));
      const leadsOrdenadosFinal = leadIds
        .map((id) => mapaLeads.get(id))
        .filter((l): l is NonNullable<typeof l> => l !== undefined);

      // 3. Contar mensagens não lidas
      const contagensNaoLidas = await prisma.whatsappMensagem.groupBy({
        by: ["id_lead"],
        where: {
          id_lead: { in: leadIds },
          from_me: false,
          lida_no_crm_em: null,
        },
        _count: { id: true },
      });

      const mapaNaoLidas = new Map(contagensNaoLidas.map((c) => [c.id_lead, c._count.id]));

      // 4. Montar resposta com preview formatado
      const conversas = leadsOrdenadosFinal.map((lead) => {
        const ultimaMsg = lead.whatsapp_mensagens[0] ?? null;
        return {
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          estagioNome: lead.estagio?.nome ?? null,
          ultimaMensagem: ultimaMsg
            ? {
                conteudo: formatarPreviewMensagem(ultimaMsg.tipo, ultimaMsg.conteudo),
                fromMe: ultimaMsg.from_me,
                timestamp: ultimaMsg.timestamp,
              }
            : null,
          naoLidas: mapaNaoLidas.get(lead.id) ?? 0,
        };
      });

      return ok({
        conversas,
        cursor: temMais ? idsPaginados[idsPaginados.length - 1].id : null,
        temMais,
      });
    } catch (erro) {
      const detalhe = erro instanceof Error
        ? { mensagem: erro.message, stack: erro.stack, nome: erro.name }
        : { erro: String(erro) };

      console.error("[conversations] ERRO DETALHADO:", JSON.stringify(detalhe, null, 2));

      return NextResponse.json(
        {
          erro: "Erro ao carregar conversas.",
          debug: detalhe,
        },
        { status: 500 }
      );
    }
  });
}
