import { NextRequest, NextResponse } from "next/server";
import {
  exigirSessao,
  podeDefinirMetaGlobal,
  podeGerenciarMetaDoPdv,
  podeGerenciarMetaIndividual,
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
  if (meta.tipo === "GLOBAL") {
    return podeDefinirMetaGlobal(sessao);
  }

  if (meta.tipo === "PDV") {
    if (!meta.id_pdv) {
      return false;
    }

    return podeGerenciarMetaDoPdv(sessao, meta.id_pdv);
  }

  if (!meta.id_funcionario) {
    return false;
  }

  return podeGerenciarMetaIndividual(sessao, meta.id_funcionario);
}

function normalizarPayloadAtualizado(meta: MetaComRelacionamentos, parcial: Partial<MetaPayload>) {
  const payload = {
    tipo: meta.tipo,
    tipo_meta: meta.tipo_meta,
    alvo: meta.alvo,
    periodo: meta.periodo,
    data_inicio: meta.data_inicio.toISOString(),
    data_fim: meta.data_fim.toISOString(),
    id_pdv: meta.id_pdv ?? undefined,
    id_funcionario: meta.id_funcionario ?? undefined,
    ...parcial,
  } as MetaPayload;

  if (payload.tipo === "GLOBAL") {
    payload.id_pdv = undefined;
    payload.id_funcionario = undefined;
  }

  if (payload.tipo === "PDV") {
    payload.id_funcionario = undefined;
  }

  if (payload.tipo === "INDIVIDUAL") {
    payload.id_pdv = undefined;
  }

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

  if (payload.tipo === "GLOBAL" && !podeDefinirMetaGlobal(auth.sessao)) {
    return respostaSemPermissao();
  }

  if (payload.tipo === "PDV" && (!payload.id_pdv || !podeGerenciarMetaDoPdv(auth.sessao, payload.id_pdv))) {
    return respostaSemPermissao();
  }

  if (payload.tipo === "INDIVIDUAL") {
    if (!payload.id_funcionario) {
      return conflict("Selecione o colaborador da meta.");
    }

    const podeGerenciar = await podeGerenciarMetaIndividual(auth.sessao, payload.id_funcionario);
    if (!podeGerenciar) {
      return respostaSemPermissao();
    }
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
    const meta = (await prismaMetas.meta.update({
      where: { id },
      data: {
        tipo: payload.tipo,
        tipo_meta: payload.tipo_meta,
        alvo: payload.alvo,
        periodo: payload.periodo,
        data_inicio: new Date(payload.data_inicio),
        data_fim: new Date(payload.data_fim),
        id_pdv: payload.tipo === "PDV" ? payload.id_pdv ?? null : null,
        id_funcionario: payload.tipo === "INDIVIDUAL" ? payload.id_funcionario ?? null : null,
      },
      include: metaInclude,
    })) as MetaComRelacionamentos;

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
