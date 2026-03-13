import { prisma } from "@/lib/prisma";
import type { PeriodoMeta, SessaoToken, TipoMeta, TipoMetaValor } from "@/lib/tipos";

// Usar prisma diretamente - os tipos do Meta ja estao gerados no cliente Prisma
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prismaMetas = prisma as any;

export const metaInclude = {
  pdv: {
    select: {
      id: true,
      nome: true,
    },
  },
  funcionario: {
    select: {
      id: true,
      nome: true,
      id_pdv: true,
    },
  },
};

export type MetaComRelacionamentos = {
  id: string;
  id_empresa: string;
  tipo: string;
  tipo_meta: string;
  alvo: number;
  periodo: string;
  data_inicio: Date;
  data_fim: Date;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  id_pdv: string | null;
  id_funcionario: string | null;
  pdv: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string; id_pdv: string | null } | null;
};

export type MetaPayload = {
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  id_pdv?: string;
  id_funcionario?: string;
};

export type MetaSerializada = {
  id: string;
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  id_pdv: string | null;
  id_funcionario: string | null;
  pdv: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string; id_pdv?: string | null } | null;
  progresso?: MetaProgressoCalculado | null;
};

export type MetaProgressoCalculado = {
  id_meta: string;
  periodo: string;
  realizado: number;
  meta: number;
  percentual: number;
  dias_restantes: number;
  faltante: number;
};

export type RankingMetaItem = {
  id: string;
  nome: string;
  percentual: number;
  posicao: number;
};

export type TetoMetaResumo = {
  id_meta: string;
  tipo_meta: TipoMetaValor;
  alvo: number;
  alocado: number;
  disponivel: number;
  pdv?: { id: string; nome: string } | null;
};

type ValidacaoTetoResultado = {
  ok: boolean;
  erro?: string;
  teto?: {
    tipo: "GLOBAL" | "PDV";
    tipo_meta: TipoMetaValor;
    alvo_pai: number;
    alocado: number;
    disponivel: number;
  } | null;
};

type ValidacaoMetaResultado =
  | {
      ok: true;
      pdv?: { id: string; nome: string } | null;
      funcionario?: { id: string; nome: string; id_pdv: string } | null;
      teto: ValidacaoTetoResultado["teto"];
    }
  | { ok: false; erro: string };

function inicioDoDia(data: Date | string) {
  const valor = new Date(data);
  return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 0, 0, 0, 0);
}

function fimDoDia(data: Date | string) {
  const valor = new Date(data);
  return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 23, 59, 59, 999);
}

export function obterPeriodoCompetencia(data: Date | string) {
  const valor = new Date(data);
  return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}`;
}

export function obterIntervaloPeriodo(periodo?: string) {
  if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
    const [ano, mes] = periodo.split("-").map(Number);
    return {
      periodo,
      inicio: new Date(ano, mes - 1, 1, 0, 0, 0, 0),
      fim: new Date(ano, mes, 0, 23, 59, 59, 999),
    };
  }

  const agora = new Date();
  return {
    periodo: obterPeriodoCompetencia(agora),
    inicio: new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0),
    fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function calcularDiasRestantes(dataFim: Date) {
  const agora = inicioDoDia(new Date());
  const fim = fimDoDia(dataFim);
  const diff = fim.getTime() - agora.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function percentualSeguro(realizado: number, meta: number) {
  if (meta <= 0) return 0;
  return Number(((realizado / meta) * 100).toFixed(1));
}

function whereConflitoEscopo(payload: MetaPayload): Record<string, unknown> {
  if (payload.tipo === "GLOBAL") {
    return { tipo: "GLOBAL" };
  }

  if (payload.tipo === "PDV") {
    return { tipo: "PDV", id_pdv: payload.id_pdv ?? null };
  }

  return { tipo: "INDIVIDUAL", id_funcionario: payload.id_funcionario ?? null };
}

function whereRealizadoMeta(meta: { id_empresa: string; id_pdv: string | null; id_funcionario: string | null; data_inicio: Date; data_fim: Date }) {
  return {
    id_empresa: meta.id_empresa,
    status: "PAGO",
    data_pagamento: {
      gte: inicioDoDia(meta.data_inicio),
      lte: fimDoDia(meta.data_fim),
    },
    lead: {
      ...(meta.id_funcionario ? { id_funcionario: meta.id_funcionario } : {}),
      ...(meta.id_pdv ? { funcionario: { id_pdv: meta.id_pdv } } : {}),
    },
  };
}

export function serializarMeta(meta: MetaComRelacionamentos, progresso?: MetaProgressoCalculado | null): MetaSerializada {
  return {
    id: meta.id,
    tipo: meta.tipo as TipoMeta,
    tipo_meta: meta.tipo_meta as TipoMetaValor,
    alvo: meta.alvo,
    periodo: meta.periodo as PeriodoMeta,
    data_inicio: meta.data_inicio.toISOString(),
    data_fim: meta.data_fim.toISOString(),
    ativo: meta.ativo,
    id_pdv: meta.id_pdv,
    id_funcionario: meta.id_funcionario,
    pdv: meta.pdv
      ? {
          id: meta.pdv.id,
          nome: meta.pdv.nome,
        }
      : null,
    funcionario: meta.funcionario
      ? {
          id: meta.funcionario.id,
          nome: meta.funcionario.nome,
          id_pdv: meta.funcionario.id_pdv,
        }
      : null,
    progresso,
  };
}

export async function calcularProgressoMeta(meta: MetaComRelacionamentos | {
  id: string;
  id_empresa: string;
  id_pdv: string | null;
  id_funcionario: string | null;
  tipo_meta: string;
  alvo: number;
  data_inicio: Date;
  data_fim: Date;
}): Promise<MetaProgressoCalculado> {
  const where = whereRealizadoMeta(meta);
  let realizado = 0;

  if (meta.tipo_meta === "VALOR") {
    const agregado = await prisma.parcela.aggregate({
      where,
      _sum: {
        valor: true,
      },
    });

    realizado = agregado._sum.valor ?? 0;
  } else {
    const contratos = await prisma.parcela.findMany({
      where,
      distinct: ["id_lead"],
      select: {
        id_lead: true,
      },
    });

    realizado = contratos.length;
  }

  const periodo = obterPeriodoCompetencia(meta.data_inicio);
  return {
    id_meta: meta.id,
    periodo,
    realizado,
    meta: meta.alvo,
    percentual: percentualSeguro(realizado, meta.alvo),
    dias_restantes: calcularDiasRestantes(meta.data_fim),
    faltante: Math.max(0, Number((meta.alvo - realizado).toFixed(2))),
  };
}

export function montarResumoTetos(metas: MetaComRelacionamentos[]) {
  const globais = metas
    .filter((meta) => meta.ativo && meta.tipo === "GLOBAL")
    .map((meta) => {
      const alocado = metas
        .filter((item) => item.ativo && item.tipo === "PDV" && item.tipo_meta === meta.tipo_meta)
        .filter((item) => item.data_inicio <= meta.data_fim && item.data_fim >= meta.data_inicio)
        .reduce((acc: number, item: MetaComRelacionamentos) => acc + item.alvo, 0);

      return {
        id_meta: meta.id,
        tipo_meta: meta.tipo_meta as TipoMetaValor,
        alvo: meta.alvo,
        alocado,
        disponivel: Math.max(0, Number((meta.alvo - alocado).toFixed(2))),
      } satisfies TetoMetaResumo;
    });

  const pdvs = metas
    .filter((meta) => meta.ativo && meta.tipo === "PDV")
    .map((meta) => {
      const alocado = metas
        .filter(
          (item) =>
            item.ativo &&
            item.tipo === "INDIVIDUAL" &&
            item.tipo_meta === meta.tipo_meta &&
            item.funcionario?.id_pdv === meta.id_pdv,
        )
        .filter((item) => item.data_inicio <= meta.data_fim && item.data_fim >= meta.data_inicio)
        .reduce((acc: number, item: MetaComRelacionamentos) => acc + item.alvo, 0);

      return {
        id_meta: meta.id,
        tipo_meta: meta.tipo_meta as TipoMetaValor,
        alvo: meta.alvo,
        alocado,
        disponivel: Math.max(0, Number((meta.alvo - alocado).toFixed(2))),
        pdv: meta.pdv
          ? {
              id: meta.pdv.id,
              nome: meta.pdv.nome,
            }
          : null,
      } satisfies TetoMetaResumo;
    });

  return { globais, pdvs };
}

async function validarTetoMeta(params: {
  id_empresa: string;
  payload: MetaPayload;
  id_meta_atual?: string;
  id_pdv_funcionario?: string;
}): Promise<ValidacaoTetoResultado> {
  const dataInicio = inicioDoDia(params.payload.data_inicio);
  const dataFim = fimDoDia(params.payload.data_fim);

  if (params.payload.tipo === "PDV") {
    const metaGlobal = await prismaMetas.meta.findFirst({
      where: {
        id_empresa: params.id_empresa,
        ativo: true,
        tipo: "GLOBAL",
        data_inicio: { lte: dataFim },
        data_fim: { gte: dataInicio },
      },
      orderBy: { criado_em: "desc" },
    });

    if (!metaGlobal) {
      return { ok: true, teto: null };
    }

    if (metaGlobal.tipo_meta !== params.payload.tipo_meta) {
      return {
        ok: false,
        erro: "A meta do PDV deve usar o mesmo indicador da meta global ativa.",
      };
    }

    const metasPdv = await prismaMetas.meta.findMany({
      where: {
        id_empresa: params.id_empresa,
        ativo: true,
        tipo: "PDV",
        data_inicio: { lte: dataFim },
        data_fim: { gte: dataInicio },
        ...(params.id_meta_atual ? { NOT: { id: params.id_meta_atual } } : {}),
      },
      select: { alvo: true },
    });

    const alocado = metasPdv.reduce((acc: number, item: { alvo: number }) => acc + item.alvo, 0);
    const disponivel = Number((metaGlobal.alvo - alocado).toFixed(2));
    if (params.payload.alvo > disponivel) {
      return {
        ok: false,
        erro: `O teto disponivel na meta global e ${Math.max(0, disponivel).toFixed(2)}.`,
        teto: {
          tipo: "GLOBAL",
          tipo_meta: metaGlobal.tipo_meta as TipoMetaValor,
          alvo_pai: metaGlobal.alvo,
          alocado,
          disponivel: Math.max(0, disponivel),
        },
      };
    }

    return {
      ok: true,
      teto: {
        tipo: "GLOBAL",
        tipo_meta: metaGlobal.tipo_meta as TipoMetaValor,
        alvo_pai: metaGlobal.alvo,
        alocado,
        disponivel: Math.max(0, disponivel),
      },
    };
  }

  if (params.payload.tipo === "INDIVIDUAL" && params.id_pdv_funcionario) {
    const metaPdv = await prismaMetas.meta.findFirst({
      where: {
        id_empresa: params.id_empresa,
        ativo: true,
        tipo: "PDV",
        id_pdv: params.id_pdv_funcionario,
        data_inicio: { lte: dataFim },
        data_fim: { gte: dataInicio },
      },
      orderBy: { criado_em: "desc" },
    });

    if (!metaPdv) {
      return { ok: true, teto: null };
    }

    if (metaPdv.tipo_meta !== params.payload.tipo_meta) {
      return {
        ok: false,
        erro: "A meta individual deve usar o mesmo indicador da meta do PDV ativa.",
      };
    }

    const metasIndividuais = await prismaMetas.meta.findMany({
      where: {
        id_empresa: params.id_empresa,
        ativo: true,
        tipo: "INDIVIDUAL",
        funcionario: {
          id_pdv: params.id_pdv_funcionario,
        },
        data_inicio: { lte: dataFim },
        data_fim: { gte: dataInicio },
        ...(params.id_meta_atual ? { NOT: { id: params.id_meta_atual } } : {}),
      },
      select: { alvo: true },
    });

    const alocado = metasIndividuais.reduce((acc: number, item: { alvo: number }) => acc + item.alvo, 0);
    const disponivel = Number((metaPdv.alvo - alocado).toFixed(2));
    if (params.payload.alvo > disponivel) {
      return {
        ok: false,
        erro: `O teto disponivel no PDV e ${Math.max(0, disponivel).toFixed(2)}.`,
        teto: {
          tipo: "PDV",
          tipo_meta: metaPdv.tipo_meta as TipoMetaValor,
          alvo_pai: metaPdv.alvo,
          alocado,
          disponivel: Math.max(0, disponivel),
        },
      };
    }

    return {
      ok: true,
      teto: {
        tipo: "PDV",
        tipo_meta: metaPdv.tipo_meta as TipoMetaValor,
        alvo_pai: metaPdv.alvo,
        alocado,
        disponivel: Math.max(0, disponivel),
      },
    };
  }

  return { ok: true, teto: null };
}

export async function validarMeta(params: {
  id_empresa: string;
  payload: MetaPayload;
  id_meta_atual?: string;
}): Promise<ValidacaoMetaResultado> {
  const dataInicio = inicioDoDia(params.payload.data_inicio);
  const dataFim = fimDoDia(params.payload.data_fim);

  let pdv: { id: string; nome: string } | null = null;
  let funcionario: { id: string; nome: string; id_pdv: string } | null = null;

  if (params.payload.tipo === "PDV" && params.payload.id_pdv) {
    pdv = await prisma.pdv.findFirst({
      where: {
        id: params.payload.id_pdv,
        id_empresa: params.id_empresa,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!pdv) {
      return { ok: false, erro: "PDV nao encontrado para esta empresa." };
    }
  }

  if (params.payload.tipo === "INDIVIDUAL" && params.payload.id_funcionario) {
    funcionario = await prisma.funcionario.findFirst({
      where: {
        id: params.payload.id_funcionario,
        id_empresa: params.id_empresa,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        id_pdv: true,
      },
    });

    if (!funcionario) {
      return { ok: false, erro: "Colaborador nao encontrado ou inativo." };
    }
  }

  const metaConflitante = await prismaMetas.meta.findFirst({
    where: {
      id_empresa: params.id_empresa,
      ativo: true,
      data_inicio: { lte: dataFim },
      data_fim: { gte: dataInicio },
      ...whereConflitoEscopo(params.payload),
      ...(params.id_meta_atual ? { NOT: { id: params.id_meta_atual } } : {}),
    },
    select: { id: true },
  });

  if (metaConflitante) {
    return { ok: false, erro: "Ja existe uma meta ativa neste periodo para o mesmo escopo." };
  }

  const teto = await validarTetoMeta({
    id_empresa: params.id_empresa,
    payload: params.payload,
    id_meta_atual: params.id_meta_atual,
    id_pdv_funcionario: funcionario?.id_pdv,
  });

  if (!teto.ok) {
    return { ok: false, erro: teto.erro ?? "Meta invalida para o teto disponivel." };
  }

  return {
    ok: true,
    pdv,
    funcionario,
    teto: teto.teto,
  };
}

export async function listarMetasSerializadas(metas: MetaComRelacionamentos[]) {
  const lista = await Promise.all(
    metas.map(async (meta) => {
      const progresso = meta.ativo ? await calcularProgressoMeta(meta) : null;
      return serializarMeta(meta, progresso);
    }),
  );

  return lista;
}

export async function calcularRankingMetas(params: {
  id_empresa: string;
  id_pdv?: string;
  periodo?: string;
}) {
  const intervalo = obterIntervaloPeriodo(params.periodo);
  const metas = (await prismaMetas.meta.findMany({
    where: {
      id_empresa: params.id_empresa,
      ativo: true,
      tipo: "INDIVIDUAL",
      data_inicio: { lte: intervalo.fim },
      data_fim: { gte: intervalo.inicio },
      ...(params.id_pdv
        ? {
            funcionario: {
              id_pdv: params.id_pdv,
            },
          }
        : {}),
    },
    include: metaInclude,
    orderBy: [{ data_fim: "desc" }, { criado_em: "desc" }],
  })) as MetaComRelacionamentos[];

  const itens = await Promise.all(
    metas.map(async (meta: MetaComRelacionamentos) => {
      const progresso = await calcularProgressoMeta(meta);
      return {
        id: meta.funcionario?.id ?? meta.id,
        nome: meta.funcionario?.nome ?? "Sem nome",
        percentual: progresso.percentual,
      };
    }),
  );

  const ranking = itens
    .sort((a: { percentual: number; nome: string }, b: { percentual: number; nome: string }) => b.percentual - a.percentual || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item: { id: string; nome: string; percentual: number }, index: number) => ({
      ...item,
      posicao: index + 1,
    })) satisfies RankingMetaItem[];

  const mediaEquipe =
    ranking.length > 0
      ? Number((ranking.reduce((acc: number, item: RankingMetaItem) => acc + item.percentual, 0) / ranking.length).toFixed(1))
      : 0;

  return {
    ranking,
    media_equipe: mediaEquipe,
    total_participantes: ranking.length,
  };
}

export function podeVisualizarMeta(sessao: SessaoToken, meta: { tipo: string; id_pdv: string | null; id_funcionario: string | null; funcionario?: { id_pdv: string | null } | null }) {
  if (sessao.perfil === "EMPRESA") {
    return true;
  }

  if (sessao.perfil === "GERENTE") {
    if (!sessao.id_pdv) return false;
    if (meta.tipo === "GLOBAL") return true;
    if (meta.id_pdv && meta.id_pdv === sessao.id_pdv) return true;
    return meta.funcionario?.id_pdv === sessao.id_pdv;
  }

  return meta.id_funcionario === sessao.id_usuario;
}
