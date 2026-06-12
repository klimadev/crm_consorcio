import { NextRequest, NextResponse } from "next/server";
import { exigirSessao, respostaSemPermissao } from "@/lib/permissoes";
import { badRequest, conflict, notFound } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { prisma } from "@/lib/prisma";
import { calcularProgresso } from "@/modules/metas/lib/calculator";
import { calcularDatasSemana } from "@/modules/metas/lib/dates";
import type { Meta } from "@/modules/metas/types";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schemaEditarMeta = z.object({
  titulo: z.string().trim().min(2).max(80).optional(),
  tipo_meta: z.enum(["VALOR", "VOLUME"]).optional(),
  origem: z.enum(["PAGAMENTOS", "FECHADOS"]).optional(),
  alvo: z.coerce.number().positive("O alvo deve ser maior que zero.").optional(),
  semana: z.coerce.number().int().min(1).max(4).optional(),
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  id_equipe: z.string().trim().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });

async function serializarMetaNova(row: any): Promise<Meta> {
  let progresso = null;
  if (row.ativo) {
    const dataInicio = new Date(row.data_inicio);
    const dataFim = new Date(row.data_fim);

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
// PATCH /api/metas/[id]
// ============================================================
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const { id } = await params;

  const metaAtual = await prisma.metaNova.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    include: { equipe: { select: { id: true, nome: true } } },
  });
  if (!metaAtual) return notFound("Meta não encontrada.");

  // Permissão
  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv || auth.sessao.id_pdv !== metaAtual.id_equipe) return respostaSemPermissao();
  } else if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) return body.response;

  const validacao = validateBody(schemaEditarMeta, body.data);
  if (!validacao.ok) return validacao.response;

  const payload = validacao.data;

  // Se mudar equipe, validar permissão
  if (payload.id_equipe && auth.sessao.perfil === "GERENTE" && payload.id_equipe !== auth.sessao.id_pdv) {
    return respostaSemPermissao();
  }

  // Se mudar semana/mês, verificar conflito de período
  const semanaNova = payload.semana ?? metaAtual.semana;
  const mesNova = payload.mes_referencia ?? metaAtual.mes_referencia;
  const equipeNova = payload.id_equipe ?? metaAtual.id_equipe;

  if (payload.semana || payload.mes_referencia || payload.id_equipe) {
    const conflito = await prisma.metaNova.findFirst({
      where: {
        id_empresa: auth.sessao.id_empresa,
        id_equipe: equipeNova,
        mes_referencia: mesNova,
        semana: semanaNova,
        ativo: true,
        id: { not: id },
      },
    });
    if (conflito) return conflict("Já existe uma meta ativa para esta equipe nesta semana.");
  }

  try {
    const updateData: any = {};
    if (payload.titulo !== undefined) updateData.titulo = payload.titulo;
    if (payload.tipo_meta !== undefined) updateData.tipo_meta = payload.tipo_meta;
    if (payload.origem !== undefined) updateData.origem = payload.origem;
    if (payload.alvo !== undefined) updateData.alvo = payload.alvo;
    if (payload.id_equipe !== undefined) updateData.id_equipe = payload.id_equipe;

    if (payload.semana !== undefined || payload.mes_referencia !== undefined) {
      updateData.semana = semanaNova;
      const { data_inicio, data_fim } = calcularDatasSemana(semanaNova, mesNova);
      updateData.data_inicio = data_inicio;
      updateData.data_fim = data_fim;
    }

    const meta = await prisma.metaNova.update({
      where: { id },
      data: updateData,
      include: { equipe: { select: { id: true, nome: true } } },
    });

    const metaSerializada = await serializarMetaNova(meta);
    return NextResponse.json({ meta: metaSerializada });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao atualizar meta.", "Erro ao atualizar meta:");
  }
}

// ============================================================
// DELETE /api/metas/[id] (soft delete)
// ============================================================
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const { id } = await params;

  const metaAtual = await prisma.metaNova.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa, ativo: true },
  });
  if (!metaAtual) return notFound("Meta não encontrada ou já inativa.");

  // Permissão
  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv || auth.sessao.id_pdv !== metaAtual.id_equipe) return respostaSemPermissao();
  } else if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  try {
    await prisma.metaNova.update({
      where: { id },
      data: { ativo: false },
    });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao arquivar meta.", "Erro ao arquivar meta:");
  }
}
