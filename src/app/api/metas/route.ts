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
  listarMetasSerializadas,
  metaInclude,
  montarResumoTetos,
  prismaMetas,
  type MetaComRelacionamentos,
  type MetaPayload,
  serializarMeta,
  validarMeta,
} from "@/lib/metas";
import { conflict } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody, validateQuery } from "@/lib/api/route-validation";
import { schemaCriarMeta, schemaListarMetas } from "@/lib/validacoes";

function filtroAcessoMetas(sessao: { perfil: string; id_pdv: string | null; id_usuario: string }) {
  if (sessao.perfil === "EMPRESA") {
    return undefined;
  }

  if (sessao.perfil === "GERENTE") {
    return {
      OR: [
        { tipo: "GLOBAL" },
        { id_pdv: sessao.id_pdv },
        { funcionario: { id_pdv: sessao.id_pdv } },
      ],
    };
  }

  return {
    id_funcionario: sessao.id_usuario,
  };
}

function filtroEscopo(query: { id_pdv?: string; id_funcionario?: string }) {
  if (query.id_funcionario) {
    return { id_funcionario: query.id_funcionario };
  }

  if (query.id_pdv) {
    return {
      OR: [{ id_pdv: query.id_pdv }, { funcionario: { id_pdv: query.id_pdv } }],
    };
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const params = request.nextUrl.searchParams;
  const validacao = validateQuery(schemaListarMetas, {
    tipo: params.get("tipo") ?? undefined,
    id_pdv: params.get("id_pdv") ?? undefined,
    id_funcionario: params.get("id_funcionario") ?? undefined,
    ativo: params.get("ativo") ?? undefined,
  });

  if (!validacao.ok) {
    return validacao.response;
  }

  const filtros = validacao.data;

  if (auth.sessao.perfil === "GERENTE") {
    if (!auth.sessao.id_pdv) {
      return respostaSemPermissao();
    }

    if (filtros.id_pdv && filtros.id_pdv !== auth.sessao.id_pdv) {
      return respostaSemPermissao();
    }

    if (filtros.id_funcionario) {
      const pode = await podeGerenciarMetaIndividual(auth.sessao, filtros.id_funcionario);
      if (!pode) {
        return respostaSemPermissao();
      }
    }
  }

  if (auth.sessao.perfil === "COLABORADOR" && filtros.id_funcionario && filtros.id_funcionario !== auth.sessao.id_usuario) {
    return respostaSemPermissao();
  }

  const condicoesAnd = [filtroAcessoMetas(auth.sessao), filtroEscopo(filtros)].filter(Boolean);

  const metas = (await prismaMetas.meta.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.ativo ? { ativo: filtros.ativo === "true" } : {}),
      ...(condicoesAnd.length > 0 ? { AND: condicoesAnd } : {}),
    },
    include: metaInclude,
    orderBy: [{ ativo: "desc" }, { data_fim: "desc" }, { criado_em: "desc" }],
  })) as MetaComRelacionamentos[];

  const metasSerializadas = await listarMetasSerializadas(metas);
  return NextResponse.json({
    metas: metasSerializadas,
    tetos: montarResumoTetos(metas),
  });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(schemaCriarMeta, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const payload = validacao.data as MetaPayload;

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

    const pode = await podeGerenciarMetaIndividual(auth.sessao, payload.id_funcionario);
    if (!pode) {
      return respostaSemPermissao();
    }
  }

  const metaValida = await validarMeta({
    id_empresa: auth.sessao.id_empresa,
    payload,
  });

  if (!metaValida.ok) {
    return conflict(metaValida.erro);
  }

  try {
    const meta = (await prismaMetas.meta.create({
      data: {
        id_empresa: auth.sessao.id_empresa,
        tipo: payload.tipo,
        tipo_meta: payload.tipo_meta,
        alvo: payload.alvo,
        periodo: payload.periodo,
        data_inicio: new Date(payload.data_inicio),
        data_fim: new Date(payload.data_fim),
        ativo: true,
        id_pdv: payload.tipo === "PDV" ? payload.id_pdv ?? null : null,
        id_funcionario: payload.tipo === "INDIVIDUAL" ? payload.id_funcionario ?? null : null,
      },
      include: metaInclude,
    })) as MetaComRelacionamentos;

    const progresso = await calcularProgressoMeta(meta);
    return NextResponse.json(
      {
        meta: serializarMeta(meta, progresso),
        teto: metaValida.teto,
      },
      { status: 201 },
    );
  } catch (erro) {
    return handleRouteError(erro, "Erro ao criar meta.", "Erro ao criar meta:");
  }
}
