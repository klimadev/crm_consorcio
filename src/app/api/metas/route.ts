import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { badRequest, notFound } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody, validateQuery } from "@/lib/api/route-validation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calcularProgresso } from "@/modules/metas/lib/calculator";
import { calcularDatasSemana, obterMesReferencia, obterSemanaDoMes } from "@/modules/metas/lib/dates";
import type { Meta } from "@/modules/metas/types";
import { mensagemErroValidacao } from "@/lib/validacoes";

// ============================================================
// Schemas de validação simplificados (overhaul)
// ============================================================
const schemaListarMetasNovo = z.object({
  id_equipe: z.string().trim().optional(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM").optional(),
  ativo: z.enum(["true", "false"]).optional(),
});

const schemaCriarMetaNovo = z.object({
  id_equipe: z.string().trim().min(1, "Selecione a equipe."),
  tipo_meta: z.enum(["VALOR", "VOLUME"]),
  origem: z.enum(["PAGAMENTOS", "FECHADOS"]).default("PAGAMENTOS"),
  alvo: z.coerce.number().positive("O alvo deve ser maior que zero."),
  semana: z.coerce.number().int().min(1).max(4),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM inválido."),
  titulo: z.string().trim().min(2, "Informe um título.").max(80).optional(),
}).refine(
  (dados) => !(dados.origem === "PAGAMENTOS" && dados.tipo_meta !== "VALOR"),
  { message: "Pagamentos só podem ser medidos por valor (VALOR)." },
);

const schemaEditarMetaNovo = z.object({
  id_equipe: z.string().trim().optional(),
  tipo_meta: z.enum(["VALOR", "VOLUME"]).optional(),
  origem: z.enum(["PAGAMENTOS", "FECHADOS"]).optional(),
  alvo: z.coerce.number().positive("O alvo deve ser maior que zero.").optional(),
  semana: z.coerce.number().int().min(1).max(4).optional(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  titulo: z.string().trim().min(2).max(80).optional(),
  ativo: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });

// ============================================================
// Helpers
// ============================================================
function filtroAcessoMetas(sessao: { perfil: string; id_pdv: string | null }) {
  if (sessao.perfil === "EMPRESA") return undefined;
  if (sessao.perfil === "GERENTE") return sessao.id_pdv;
  return "__sem_acesso__"; // nunca encontra
}

async function serializarMetaNova(row: any): Promise<Meta> {
  // Busca progresso real (pagamentos / leads)
  const dataInicio = new Date(row.data_inicio);
  const dataFim = new Date(row.data_fim);

  let progresso = null;
  if (row.ativo) {
    if (row.origem === "PAGAMENTOS") {
      const pagamentos = await prisma.parcela.aggregate({
        where: {
          id_empresa: row.id_empresa,
          status: "PAGO",
          data_pagamento: { gte: dataInicio, lte: dataFim },
          lead: row.id_equipe ? { funcionario: { id_pdv: row.id_equipe } } : undefined,
        },
        _sum: { valor: true },
      });
      progresso = calcularProgresso(
        { alvo: row.alvo, tipo_meta: row.tipo_meta, origem: row.origem, data_fim: row.data_fim },
        [{ valor: pagamentos._sum.valor ?? 0 }],
      );
    } else {
      const leadsFechados = await prisma.lead.findMany({
        where: {
          id_empresa: row.id_empresa,
          aprovado_em: { gte: dataInicio, lte: dataFim },
          ...(row.id_equipe ? { funcionario: { id_pdv: row.id_equipe } } : {}),
        },
        select: { id: true, valor_consorcio: true },
      });
      progresso = calcularProgresso(
        { alvo: row.alvo, tipo_meta: row.tipo_meta, origem: row.origem, data_fim: row.data_fim },
        undefined,
        leadsFechados,
      );
    }
  }

  return {
    id: row.id,
    id_empresa: row.id_empresa,
    titulo: row.titulo,
    tipo_meta: row.tipo_meta as "VALOR" | "VOLUME",
    origem: row.origem as "PAGAMENTOS" | "FECHADOS",
    alvo: row.alvo,
    semana: row.semana,
    mes_referencia: row.mes_referencia,
    data_inicio: row.data_inicio.toISOString(),
    data_fim: row.data_fim.toISOString(),
    ativo: row.ativo,
    id_equipe: row.id_equipe,
    criado_em: row.criado_em.toISOString(),
    atualizado_em: row.atualizado_em.toISOString(),
    equipe: row.equipe ? { id: row.equipe.id, nome: row.equipe.nome } : null,
    progresso,
  };
}

// ============================================================
// GET /api/metas
// ============================================================
export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const params = request.nextUrl.searchParams;
  const validacao = validateQuery(schemaListarMetasNovo, {
    id_equipe: params.get("id_equipe") ?? undefined,
    mes_referencia: params.get("mes_referencia") ?? undefined,
    ativo: params.get("ativo") ?? undefined,
  });
  if (!validacao.ok) return validacao.response;

  const filtros = validacao.data;
  const filtroAcesso = filtroAcessoMetas(auth.sessao);

  // GERENTE: só vê própria equipe
  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv) return respostaSemPermissao();
    if (filtros.id_equipe && filtros.id_equipe !== auth.sessao.id_pdv) return respostaSemPermissao();
  }

  try {
    const rows = await prisma.metaNova.findMany({
      where: {
        id_empresa: auth.sessao.id_empresa,
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo === "true" } : { ativo: true }),
        ...(filtros.id_equipe ? { id_equipe: filtros.id_equipe } : {}),
        ...(filtros.mes_referencia ? { mes_referencia: filtros.mes_referencia } : {}),
        ...(filtroAcesso && filtroAcesso !== "__sem_acesso__" ? { id_equipe: filtroAcesso } : {}),
        ...(filtroAcesso === "__sem_acesso__" ? { id: "__none__" } : {}),
      },
      include: { equipe: { select: { id: true, nome: true } } },
      orderBy: [{ mes_referencia: "desc" }, { semana: "asc" }, { criado_em: "desc" }],
    });

    const metas = await Promise.all(rows.map(serializarMetaNova));
    return NextResponse.json({ metas });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao listar metas.", "Erro ao listar metas:");
  }
}

// ============================================================
// POST /api/metas
// ============================================================
export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  if (auth.sessao.perfil === "COLABORADOR") return respostaSemPermissao();

  const body = await parseJson<unknown>(request);
  if (!body.ok) return body.response;

  const validacao = validateBody(schemaCriarMetaNovo, body.data);
  if (!validacao.ok) return validacao.response;

  const payload = validacao.data;

  // Permissão: GERENTE só cria na própria equipe
  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv || auth.sessao.id_pdv !== payload.id_equipe) return respostaSemPermissao();
  }

  // Verifica se equipe existe
  const equipe = await prisma.pdv.findFirst({
    where: { id: payload.id_equipe, id_empresa: auth.sessao.id_empresa },
    select: { id: true, nome: true },
  });
  if (!equipe) return badRequest("Equipe não encontrada.");

  // Nota: não verificamos unicidade — múltiplas metas por equipe/semana são permitidas
  // (ex: meta de valor + volume na mesma semana)

  // Calcula datas automaticamente
  const { data_inicio, data_fim } = calcularDatasSemana(payload.semana, payload.mes_referencia);
  const tituloValido = payload.titulo?.trim() || `Meta S${payload.semana} - ${payload.mes_referencia}`;

  try {
    const meta = await prisma.metaNova.create({
      data: {
        id_empresa: auth.sessao.id_empresa,
        id_equipe: payload.id_equipe,
        titulo: tituloValido,
        tipo_meta: payload.tipo_meta,
        origem: payload.origem,
        alvo: payload.alvo,
        semana: payload.semana,
        mes_referencia: payload.mes_referencia,
        data_inicio,
        data_fim,
        ativo: true,
      },
      include: { equipe: { select: { id: true, nome: true } } },
    });

    const metaSerializada = await serializarMetaNova(meta);
    return NextResponse.json({ meta: metaSerializada }, { status: 201 });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao criar meta.", "Erro ao criar meta:");
  }
}
