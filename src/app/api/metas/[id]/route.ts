import { NextRequest, NextResponse } from "next/server";
import {
  exigirSessao,
  podeGerenciarMetaDoPdv,
  respostaSemPermissao,
} from "@/lib/permissoes";
import {
  calcularProgressoMeta,
  metaInclude,
  prismaMetas,
  type MetaComRelacionamentos,
  type MetaPayload,
  serializarMeta,
  validarMeta,
} from "@/lib/metas";
import { badRequest, conflict, notFound } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import type { SessaoToken } from "@/lib/tipos";
import { mensagemErroValidacao, schemaAtualizarMeta, schemaCriarMeta } from "@/lib/validacoes";

type Params = {
  params: Promise<{ id: string }>;
};

function obterPeriodoTipo(periodo: MetaPayload["periodo"]) {
  switch (periodo) {
    case "MENSAIS":
      return "MES";
    case "TRIMESTRAL":
      return "TRIMESTRE";
    case "ANUAL":
      return "ANO";
    case "PERSONALIZADO":
      return "PERSONALIZADO";
    default:
      return "SEMANA";
  }
}

function obterSemanaDoMes(data: Date): 1 | 2 | 3 | 4 {
  const dia = data.getDate();
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

async function carregarMeta(id: string, idEmpresa: string) {
  return (await prismaMetas.meta.findFirst({
    where: {
      id,
      id_empresa: idEmpresa,
    },
    include: metaInclude,
  })) as MetaComRelacionamentos | null;
}

async function podeGerenciarMetaExistente(
  sessao: SessaoToken,
  meta: MetaComRelacionamentos,
) {
  if (meta.tipo !== "PDV" || !meta.id_pdv) {
    return false;
  }

  return podeGerenciarMetaDoPdv(sessao, meta.id_pdv);
}

function normalizarPayloadAtualizado(meta: MetaComRelacionamentos, parcial: Partial<MetaPayload>) {
  const payload = {
    titulo: meta.periodo_ref?.template?.nome ?? meta.periodo_ref?.periodo_label ?? meta.pdv?.nome ?? "Meta",
    tipo: "PDV",
    tipo_meta: meta.tipo_meta,
    origem_resultado: meta.periodo_ref?.template?.origem_resultado ?? "PAGAMENTOS",
    alvo: meta.alvo,
    periodo: meta.periodo,
    data_inicio: meta.data_inicio.toISOString(),
    data_fim: meta.data_fim.toISOString(),
    id_pdv: meta.id_pdv ?? undefined,
    ...parcial,
  } as MetaPayload;

  return payload;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const metaAtual = await carregarMeta(id, auth.sessao.id_empresa);

  if (!metaAtual) {
    return notFound("Meta nao encontrada.");
  }

  const podeEditarAtual = await podeGerenciarMetaExistente(auth.sessao, metaAtual);
  if (!podeEditarAtual) {
    return respostaSemPermissao();
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(schemaAtualizarMeta, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const payloadAtualizado = normalizarPayloadAtualizado(metaAtual, validacao.data as Partial<MetaPayload>);
  const validacaoCompleta = schemaCriarMeta.safeParse(payloadAtualizado);

  if (!validacaoCompleta.success) {
    return badRequest(mensagemErroValidacao(validacaoCompleta.error));
  }

  const payload = validacaoCompleta.data as MetaPayload;

  if (payload.tipo !== "PDV" || !payload.id_pdv || !podeGerenciarMetaDoPdv(auth.sessao, payload.id_pdv)) {
    return respostaSemPermissao();
  }

  const metaValida = await validarMeta({
    id_empresa: auth.sessao.id_empresa,
    payload,
    id_meta_atual: id,
  });

  if (!metaValida.ok) {
    return conflict(metaValida.erro);
  }

  try {
    const dataInicio = new Date(payload.data_inicio);
    const dataFim = new Date(payload.data_fim);

    await prismaMetas.meta.update({
      where: { id },
      data: {
        tipo: "PDV",
        tipo_meta: payload.tipo_meta,
        alvo: payload.alvo,
        periodo: payload.periodo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        id_pdv: payload.id_pdv ?? null,
        id_funcionario: null,
      },
    });

    if (metaAtual.periodo_ref?.template?.id) {
      await prismaMetas.metaTemplate.update({
        where: { id: metaAtual.periodo_ref.template.id },
        data: {
          nome: payload.titulo,
          tipo_meta: payload.tipo_meta,
          origem_resultado: payload.origem_resultado,
          cadencia: payload.cadencia,
          vigencia_inicio: dataInicio,
          vigencia_fim: dataFim,
          id_pdv: payload.id_pdv ?? null,
        },
      });
    }

    if (metaAtual.periodo_ref?.id) {
      await prismaMetas.metaPeriodo.update({
        where: { id: metaAtual.periodo_ref.id },
        data: {
          periodo_tipo: obterPeriodoTipo(payload.periodo),
          periodo_label: payload.titulo,
          ano: dataInicio.getFullYear(),
          mes: dataInicio.getMonth() + 1,
          trimestre: null,
          semana_do_mes: payload.periodo === "SEMANAL" ? obterSemanaDoMes(dataInicio) : null,
          alvo: payload.alvo,
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
      });
    }

    const meta = (await carregarMeta(id, auth.sessao.id_empresa)) as MetaComRelacionamentos | null;
    if (!meta) {
      return notFound("Meta nao encontrada.");
    }

    const progresso = await calcularProgressoMeta(meta);
    return NextResponse.json({
      meta: serializarMeta(meta, progresso),
      teto: metaValida.teto,
    });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao atualizar meta.", "Erro ao atualizar meta:");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const metaAtual = await carregarMeta(id, auth.sessao.id_empresa);

  if (!metaAtual) {
    return notFound("Meta nao encontrada.");
  }

  const podeExcluir = await podeGerenciarMetaExistente(auth.sessao, metaAtual);
  if (!podeExcluir) {
    return respostaSemPermissao();
  }

  try {
    await prismaMetas.meta.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao desativar meta.", "Erro ao desativar meta:");
  }
}
