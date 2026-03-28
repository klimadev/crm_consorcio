import { prisma } from "@/lib/prisma";
import type {
  OrigemResultadoMeta,
  PeriodoMeta,
  SessaoToken,
  TipoMeta,
  TipoMetaValor,
} from "@/lib/tipos";

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
  periodo_ref: {
    include: {
      template: true,
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
  periodo_ref?: {
    id?: string;
    periodo_label?: string;
    template?: {
      id?: string;
      nome?: string | null;
      origem_resultado?: string | null;
      estagio_ganho_min_ordem?: number | null;
    } | null;
  } | null;
};

export type MetaPayload = {
  titulo: string;
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  origem_resultado?: OrigemResultadoMeta;
  cadencia?: string;
  recorrencia?: string;
  criar_periodos_automaticamente?: boolean;
  dividir_mensal_em_semanas?: boolean;
  estagio_ganho_min_ordem?: number;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  id_pdv?: string;
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

export type MetaPeriodoSerializado = {
  id: string;
  id_template: string | null;
  id_meta_legada: string | null;
  periodo_tipo: "SEMANA" | "MES" | "TRIMESTRE" | "ANO" | "PERSONALIZADO";
  periodo_label: string;
  ano: number;
  mes: number | null;
  trimestre: number | null;
  semana_do_mes: 1 | 2 | 3 | 4 | null;
  alvo: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  progresso?: MetaProgressoCalculado | null;
};

export type MetaSerializada = {
  id: string;
  titulo: string;
  tipo: "PDV";
  tipo_meta: TipoMetaValor;
  origem_resultado: OrigemResultadoMeta;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  id_pdv: string | null;
  id_funcionario: null;
  pdv: { id: string; nome: string } | null;
  funcionario: null;
  progresso?: MetaProgressoCalculado | null;
  template: null;
  periodo_item: MetaPeriodoSerializado;
};

export type RankingMetaItem = {
  id: string;
  nome: string;
  percentual: number;
  posicao: number;
  realizado: number;
  meta: number;
  faltante: number;
};

type ValidacaoMetaResultado =
  | {
      ok: true;
      pdv: { id: string; nome: string };
      teto: null;
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

function obterAnoSemanaIso(data: Date | string) {
  const valor = inicioDoDia(data);
  const dataUtc = new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()));
  const diaSemana = dataUtc.getUTCDay() || 7;
  dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaSemana);
  const ano = dataUtc.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const semana = Math.ceil((((dataUtc.getTime() - inicioAno.getTime()) / 86400000) + 1) / 7);
  return { ano, semana };
}

export function obterPeriodoCompetenciaSemanal(data: Date | string) {
  const { ano, semana } = obterAnoSemanaIso(data);
  return `${ano}-W${String(semana).padStart(2, "0")}`;
}

export function obterIntervaloPeriodoSemanal(periodo?: string) {
  if (periodo && /^\d{4}-W\d{2}$/.test(periodo)) {
    const [anoTexto, semanaTexto] = periodo.split("-W");
    const ano = Number(anoTexto);
    const semana = Number(semanaTexto);
    const quartaPrimeiraSemana = new Date(Date.UTC(ano, 0, 4));
    const diaSemana = quartaPrimeiraSemana.getUTCDay() || 7;
    const inicioPrimeiraSemana = new Date(quartaPrimeiraSemana);
    inicioPrimeiraSemana.setUTCDate(quartaPrimeiraSemana.getUTCDate() - diaSemana + 1);
    const inicioUtc = new Date(inicioPrimeiraSemana);
    inicioUtc.setUTCDate(inicioPrimeiraSemana.getUTCDate() + (semana - 1) * 7);

    const inicio = new Date(inicioUtc.getUTCFullYear(), inicioUtc.getUTCMonth(), inicioUtc.getUTCDate(), 0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { periodo, inicio, fim };
  }

  const hoje = new Date();
  const dia = hoje.getDay() || 7;
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - dia + 1);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return {
    periodo: obterPeriodoCompetenciaSemanal(inicio),
    inicio,
    fim,
  };
}

function obterSemanaComercialDoMes(data: Date | string): 1 | 2 | 3 | 4 {
  const dia = new Date(data).getDate();
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

function obterPeriodoTipo(periodo: PeriodoMeta): MetaPeriodoSerializado["periodo_tipo"] {
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

function obterTituloMeta(meta: MetaComRelacionamentos) {
  return meta.periodo_ref?.template?.nome?.trim() || meta.periodo_ref?.periodo_label?.trim() || meta.pdv?.nome || "Meta sem titulo";
}

function obterOrigemResultadoMeta(meta: Pick<MetaComRelacionamentos, "periodo_ref">) {
  return (meta.periodo_ref?.template?.origem_resultado as OrigemResultadoMeta | undefined) ?? "PAGAMENTOS";
}

function intervaloRegistroMeta(meta: {
  id_empresa: string;
  id_pdv: string | null;
  data_inicio: Date;
  data_fim: Date;
}) {
  return {
    id_empresa: meta.id_empresa,
    ...(meta.id_pdv ? { funcionario: { id_pdv: meta.id_pdv } } : {}),
    aprovado_em: {
      gte: inicioDoDia(meta.data_inicio),
      lte: fimDoDia(meta.data_fim),
    },
  };
}

function intervaloPagamentosMeta(meta: {
  id_empresa: string;
  id_pdv: string | null;
  data_inicio: Date;
  data_fim: Date;
}) {
  return {
    id_empresa: meta.id_empresa,
    status: "PAGO",
    data_pagamento: {
      gte: inicioDoDia(meta.data_inicio),
      lte: fimDoDia(meta.data_fim),
    },
    lead: meta.id_pdv ? { funcionario: { id_pdv: meta.id_pdv } } : undefined,
  };
}

function criarPeriodoItem(meta: MetaComRelacionamentos, progresso?: MetaProgressoCalculado | null): MetaPeriodoSerializado {
  const titulo = obterTituloMeta(meta);
  return {
    id: meta.id,
    id_template: meta.periodo_ref?.template?.id ?? null,
    id_meta_legada: meta.id,
    periodo_tipo: obterPeriodoTipo(meta.periodo as PeriodoMeta),
    periodo_label: meta.periodo_ref?.periodo_label ?? titulo,
    ano: meta.data_inicio.getFullYear(),
    mes: meta.data_inicio.getMonth() + 1,
    trimestre: null,
    semana_do_mes: meta.periodo === "SEMANAL" ? obterSemanaComercialDoMes(meta.data_inicio) : null,
    alvo: meta.alvo,
    data_inicio: meta.data_inicio.toISOString(),
    data_fim: meta.data_fim.toISOString(),
    ativo: meta.ativo,
    progresso,
  };
}

export function serializarMeta(meta: MetaComRelacionamentos, progresso?: MetaProgressoCalculado | null): MetaSerializada {
  return {
    id: meta.id,
    titulo: obterTituloMeta(meta),
    tipo: "PDV",
    tipo_meta: meta.tipo_meta as TipoMetaValor,
    origem_resultado: obterOrigemResultadoMeta(meta),
    alvo: meta.alvo,
    periodo: meta.periodo as PeriodoMeta,
    data_inicio: meta.data_inicio.toISOString(),
    data_fim: meta.data_fim.toISOString(),
    ativo: meta.ativo,
    id_pdv: meta.id_pdv,
    id_funcionario: null,
    pdv: meta.pdv ? { id: meta.pdv.id, nome: meta.pdv.nome } : null,
    funcionario: null,
    progresso,
    template: null,
    periodo_item: criarPeriodoItem(meta, progresso),
  };
}

export async function calcularProgressoMeta(meta: {
  id: string;
  id_empresa: string;
  id_pdv: string | null;
  tipo_meta: string;
  periodo_ref?: MetaComRelacionamentos["periodo_ref"];
  alvo: number;
  data_inicio: Date;
  data_fim: Date;
}): Promise<MetaProgressoCalculado> {
  const origemResultado = obterOrigemResultadoMeta(meta);
  let realizado = 0;

  if (origemResultado === "PAGAMENTOS") {
    const pagamentos = await prisma.parcela.aggregate({
      where: intervaloPagamentosMeta(meta),
      _sum: { valor: true },
    });
    realizado = pagamentos._sum.valor ?? 0;
  } else {
    const leadsFechados = await prisma.lead.findMany({
      where: intervaloRegistroMeta(meta),
      select: {
        id: true,
        valor_consorcio: true,
      },
    });

    realizado = meta.tipo_meta === "VALOR"
      ? leadsFechados.reduce((total, lead) => total + (lead.valor_consorcio ?? 0), 0)
      : leadsFechados.length;
  }

  const periodo = obterPeriodoCompetenciaSemanal(meta.data_inicio);

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

export async function validarMeta(params: {
  id_empresa: string;
  payload: MetaPayload;
  id_meta_atual?: string;
}): Promise<ValidacaoMetaResultado> {
  if (params.payload.tipo !== "PDV" || !params.payload.id_pdv) {
    return { ok: false, erro: "A meta precisa ser criada para uma equipe." };
  }

  const pdv = await prisma.pdv.findFirst({
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
    return { ok: false, erro: "Equipe nao encontrada para esta empresa." };
  }

  const dataInicio = inicioDoDia(params.payload.data_inicio);
  const dataFim = fimDoDia(params.payload.data_fim);

  const metaConflitante = await prismaMetas.meta.findFirst({
    where: {
      id_empresa: params.id_empresa,
      ativo: true,
      tipo: "PDV",
      id_pdv: params.payload.id_pdv,
      data_inicio: { lte: dataFim },
      data_fim: { gte: dataInicio },
      ...(params.id_meta_atual ? { NOT: { id: params.id_meta_atual } } : {}),
    },
    select: { id: true },
  });

  if (metaConflitante) {
    return { ok: false, erro: "Ja existe uma meta ativa para essa equipe nesse periodo." };
  }

  return {
    ok: true,
    pdv,
    teto: null,
  };
}

export async function listarMetasSerializadas(metas: MetaComRelacionamentos[]) {
  return Promise.all(
    metas.map(async (meta) => {
      const progresso = meta.ativo ? await calcularProgressoMeta(meta) : null;
      return serializarMeta(meta, progresso);
    }),
  );
}

export async function listarEstruturaMetas(_params?: unknown) {
  void _params;
  return {
    templates: [],
    periodos: [],
  };
}

export function montarResumoTetos(_metas?: MetaComRelacionamentos[]) {
  void _metas;
  return {
    globais: [],
    pdvs: [],
  };
}

export async function criarMetaComTemplate(params: { id_empresa: string; payload: MetaPayload }) {
  const dataInicio = inicioDoDia(params.payload.data_inicio);
  const dataFim = fimDoDia(params.payload.data_fim);

  const meta = await prismaMetas.$transaction(async (tx: typeof prismaMetas) => {
    const template = await tx.metaTemplate.create({
      data: {
        id_empresa: params.id_empresa,
        tipo: "PDV",
        tipo_meta: params.payload.tipo_meta,
        origem_resultado: params.payload.origem_resultado ?? "PAGAMENTOS",
        cadencia: params.payload.cadencia ?? "PERSONALIZADO",
        recorrencia: params.payload.recorrencia ?? "PONTUAL",
        nome: params.payload.titulo,
        vigencia_inicio: dataInicio,
        vigencia_fim: dataFim,
        ativo: true,
        id_pdv: params.payload.id_pdv ?? null,
        id_funcionario: null,
      },
    });

    const metaCriada = await tx.meta.create({
      data: {
        id_empresa: params.id_empresa,
        tipo: "PDV",
        tipo_meta: params.payload.tipo_meta,
        alvo: params.payload.alvo,
        periodo: params.payload.periodo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        ativo: true,
        id_pdv: params.payload.id_pdv ?? null,
        id_funcionario: null,
      },
    });

    await tx.metaPeriodo.create({
      data: {
        id_empresa: params.id_empresa,
        id_template: template.id,
        id_meta_legada: metaCriada.id,
        periodo_tipo: obterPeriodoTipo(params.payload.periodo),
        periodo_label: params.payload.titulo,
        ano: dataInicio.getFullYear(),
        mes: dataInicio.getMonth() + 1,
        trimestre: null,
        semana_do_mes: params.payload.periodo === "SEMANAL" ? obterSemanaComercialDoMes(dataInicio) : null,
        alvo: params.payload.alvo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        ativo: true,
      },
    });

    return tx.meta.findUnique({
      where: { id: metaCriada.id },
      include: metaInclude,
    });
  });

  return meta as MetaComRelacionamentos;
}

export async function calcularRankingMetas(params: {
  id_empresa: string;
  id_pdv?: string;
  periodo?: string;
}) {
  const intervalo = params.periodo ? obterIntervaloPeriodoSemanal(params.periodo) : null;
  const metas = (await prismaMetas.meta.findMany({
    where: {
      id_empresa: params.id_empresa,
      ativo: true,
      tipo: "PDV",
      ...(intervalo
        ? {
            data_inicio: { lte: intervalo.fim },
            data_fim: { gte: intervalo.inicio },
          }
        : {}),
      ...(params.id_pdv ? { id_pdv: params.id_pdv } : {}),
    },
    include: metaInclude,
    orderBy: [{ data_inicio: "desc" }, { criado_em: "desc" }],
  })) as MetaComRelacionamentos[];

  const itens = await Promise.all(
    metas.map(async (meta) => {
      const progresso = await calcularProgressoMeta(meta);
      return {
        id: meta.id_pdv ?? meta.id,
        nome: meta.pdv?.nome ?? "Equipe sem nome",
        percentual: progresso.percentual,
        realizado: progresso.realizado,
        meta: progresso.meta,
        faltante: progresso.faltante,
      };
    }),
  );

  const ranking = itens
    .sort((a, b) => b.percentual - a.percentual || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item, index) => ({
      ...item,
      posicao: index + 1,
    })) satisfies RankingMetaItem[];

  const mediaEquipe =
    ranking.length > 0
      ? Number((ranking.reduce((acc, item) => acc + item.percentual, 0) / ranking.length).toFixed(1))
      : 0;

  return {
    ranking,
    media_equipe: mediaEquipe,
    total_participantes: ranking.length,
  };
}

export function podeVisualizarMeta(
  sessao: SessaoToken,
  meta: { id_pdv: string | null },
) {
  if (sessao.perfil === "EMPRESA") {
    return true;
  }

  if (sessao.perfil === "GERENTE") {
    return Boolean(sessao.id_pdv) && sessao.id_pdv === meta.id_pdv;
  }

  return false;
}
