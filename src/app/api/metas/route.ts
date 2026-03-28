import { NextRequest, NextResponse } from "next/server";
import {
  exigirSessao,
  podeGerenciarMetaDoPdv,
  respostaSemPermissao,
} from "@/lib/permissoes";
import {
  calcularProgressoMeta,
  criarMetaComTemplate,
  listarEstruturaMetas,
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

function filtroAcessoMetas(sessao: { perfil: string; id_pdv: string | null }) {
  if (sessao.perfil === "EMPRESA") {
    return undefined;
  }

  if (sessao.perfil === "GERENTE") {
    return { id_pdv: sessao.id_pdv };
  }

  return { id: "__sem_acesso__" };
}

function filtroEscopo(query: { id_pdv?: string }) {
  if (query.id_pdv) {
    return { id_pdv: query.id_pdv };
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
    id_pdv: params.get("id_pdv") ?? undefined,
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

  }

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const condicoesAnd = [filtroAcessoMetas(auth.sessao), filtroEscopo(filtros)].filter(Boolean);

  const metas = (await prismaMetas.meta.findMany({
    where: {
      id_empresa: auth.sessao.id_empresa,
      tipo: "PDV",
      ...(filtros.ativo ? { ativo: filtros.ativo === "true" } : {}),
      ...(condicoesAnd.length > 0 ? { AND: condicoesAnd } : {}),
    },
    include: metaInclude,
    orderBy: [{ ativo: "desc" }, { data_fim: "desc" }, { criado_em: "desc" }],
  })) as MetaComRelacionamentos[];

  const metasSerializadas = await listarMetasSerializadas(metas);
  const estrutura = await listarEstruturaMetas({
    id_empresa: auth.sessao.id_empresa,
    ativo: filtros.ativo ? filtros.ativo === "true" : true,
    id_pdv: filtros.id_pdv,
    acesso: condicoesAnd.length > 0 ? { AND: condicoesAnd } : undefined,
  });

  return NextResponse.json({
    metas: metasSerializadas,
    templates: estrutura.templates,
    periodos: estrutura.periodos,
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

  if (payload.tipo !== "PDV" || !payload.id_pdv || !podeGerenciarMetaDoPdv(auth.sessao, payload.id_pdv)) {
    return respostaSemPermissao();
  }

  const metaValida = await validarMeta({
    id_empresa: auth.sessao.id_empresa,
    payload,
  });

  if (!metaValida.ok) {
    return conflict(metaValida.erro);
  }

  try {
    const meta = (await criarMetaComTemplate({
      id_empresa: auth.sessao.id_empresa,
      payload,
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
