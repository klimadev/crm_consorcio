import type { PrismaClient } from "@prisma/client";

// Consultas agregadas da tela de recebimentos em SQL puro.
//
// Por quê raw: o SQLite responde cada aggregate/groupBy com um scan completo
// da tabela. A rota antiga disparava ~18 scans paralelos e ainda trazia TODAS
// as parcelas para agrupar por mês em JS (com 27 mil parcelas: meio segundo
// por carregamento). Aqui cada granularidade da tela (resumo global, bucket
// mensal, carteira por cliente) vira UM scan com SUM(CASE WHEN ...), porque o
// SQLite avalia todas as métricas na mesma passada.
//
// Segurança: as strings SQL são montadas apenas com fragmentos constantes;
// todo valor dinâmico entra por placeholder numerado do SQLite ("?1", "?2"...)
// bindado pela engine — nenhum valor de usuário é concatenado na string.
// Placeholders numerados (em vez de "?" posicionais) porque os CASEs repetem
// as condições de status/data várias vezes na mesma query; com "?1" o valor é
// bindado uma vez e reusado, sem contagem manual de posições.
//
// Armazenamento Prisma/SQLite que estas consultas assumem:
// - DATETIME => INTEGER (epoch ms) => MIN/MAX crus voltam BigInt; converter com Number().
// - Decimal   => REAL                  => SUM volta number.
// - strftime precisa de segundos: dividir ms por 1000 com modifier 'unixepoch'.

// Filtros da tela já normalizados pela rota (busca trimada, datas como Date).
export type FiltrosAgregacao = {
  idEmpresa: string;
  dataInicial: Date | null;
  dataFinal: Date | null;
  busca: string;
  idFuncionario: string | null;
  idPdv: string | null;
};

// Shape compatível com GrupoCarteira (montarCarteira) por tipagem estrutural.
export type GrupoAgregadoLead = {
  id_lead: string;
  _count: { _all: number };
  _sum?: { valor: number | null };
  _min?: { data_vencimento: Date | null };
  _max?: { data_pagamento?: Date | null; quantidade_total?: number | null };
};

export type ResumoAgregado = {
  quantidadeMonitoradas: number;
  quantidadeRecebidas: number;
  totalRecebido: number;
  quantidadePendentes: number;
  totalEmAberto: number;
  quantidadeAtrasadas: number;
  totalAtrasado: number;
  quantidadeCanceladas: number;
  totalCancelado: number;
  quantidadeAbortadas: number;
  totalAbortado: number;
  quantidadePerdidas: number;
  totalPerdido: number;
  parcelasVencendo7Dias: number;
  totalRecebidoPeriodo: number;
};

export type BucketMensal = { chave: string; label: string; recebido: number; previsto: number };

// Linha crua do SQLite: agregados vêm BigInt e datas vêm INTEGER (ms).
type LinhaSQL = Record<string, unknown>;

function paraNumero(valor: unknown): number {
  return typeof valor === "number" ? valor : Number(valor ?? 0);
}

function paraData(valor: unknown): Date | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor;
  return new Date(Number(valor));
}

type WhereMontado = { where: string; params: unknown[]; proximoIndice: number; joins: string };
// WHERE comum às consultas: empresa + período (vencimento OU pagamento) +
// responsável/PDV + busca textual, espelhando o whereBase/whereBusca da rota.
// `incluirBusca: false` reproduz o comparativo de período anterior, que por
// decisão de produto ignora a busca textual. Os placeholders começam em
// `indiceInicial` porque algumas consultas reservam ?1/?2 para datas internas.
function montarWhere(filtros: FiltrosAgregacao, incluirBusca: boolean, indiceInicial = 1): WhereMontado {
  let indice = indiceInicial;
  const params: unknown[] = [];

  const proximo = (valor: unknown): string => {
    const marcador = `?${indice}`;
    indice += 1;
    // Datas bindam como epoch ms: a engine envia Date como string ISO e
    // "INTEGER >= TEXT" no SQLite é sempre falso.
    params.push(valor instanceof Date ? valor.getTime() : valor);
    return marcador;
  };

  const clausulas: string[] = [`p.id_empresa = ${proximo(filtros.idEmpresa)}`];

  if (filtros.dataInicial || filtros.dataFinal) {
    const restricoes = (coluna: string) => {
      const partes: string[] = [];
      if (filtros.dataInicial) partes.push(`${coluna} >= ${proximo(filtros.dataInicial)}`);
      if (filtros.dataFinal) partes.push(`${coluna} <= ${proximo(filtros.dataFinal)}`);
      return partes.join(" AND ");
    };
    clausulas.push(`((${restricoes("p.data_vencimento")}) OR (${restricoes("p.data_pagamento")}))`);
  }

  if (filtros.idFuncionario) {
    clausulas.push(`l.id_funcionario = ${proximo(filtros.idFuncionario)}`);
  }
  if (filtros.idPdv) {
    clausulas.push(`f.id_pdv = ${proximo(filtros.idPdv)}`);
  }
  if (incluirBusca && filtros.busca) {
    const partes = [`%${filtros.busca}%`, `%${filtros.busca}%`, `%${filtros.busca}%`, `%${filtros.busca}%`].map(proximo);
    clausulas.push(`(l.nome LIKE ${partes[0]} OR l.telefone LIKE ${partes[1]} OR f.nome LIKE ${partes[2]} OR pdv.nome LIKE ${partes[3]})`);
  }

  const precisaJoin = Boolean(filtros.busca || filtros.idFuncionario || filtros.idPdv);
  // Junções só quando um filtro precisa delas: sem filtro a rota faz um scan
  // puro sobre o índice de empresa, sem lookup algum nas tabelas de lead.
  const joins = precisaJoin
    ? ' LEFT JOIN "Lead" l ON l.id = p.id_lead' +
      ' LEFT JOIN "Funcionario" f ON f.id = l.id_funcionario' +
      ' LEFT JOIN "Pdv" pdv ON pdv.id = f.id_pdv'
    : "";

  return { where: clausulas.join(" AND "), params, proximoIndice: indice, joins };
}

// Todas as métricas do resumo em um único scan. Bindings: ?1 = hoje,
// ?2 = limite de "vencendo nos próximos 7 dias", ?3/?4 = janela de pagamento
// do período (quando existir), demais = WHERE.
export async function consultarResumoAgregado(
  prisma: PrismaClient,
  filtros: FiltrosAgregacao,
  referencia: { hoje: Date; limiteVencendo7Dias: Date },
): Promise<ResumoAgregado> {
  const casoPagas = "(p.status = 'PAGA' OR (p.status NOT IN ('CANCELADA', 'ABORTADA') AND p.data_pagamento IS NOT NULL))";
  const casoAguardando = "p.status IN ('AGUARDANDO', 'ATRASADA') AND p.data_pagamento IS NULL AND p.data_vencimento >= ?1";
  const casoAtrasada = "p.status IN ('AGUARDANDO', 'ATRASADA') AND p.data_pagamento IS NULL AND p.data_vencimento < ?1";
  const casoPerdidas = "p.status IN ('CANCELADA', 'ABORTADA')";

  // CAST AS REAL: sem ele o SQLite devolve INTEGER quando a soma fecha redonda
  // e REAL quando sobra centavo — a engine Prisma tipa a coluna inteira pelo
  // primeiro valor e quebra o unpack com "não inteiro para BigInt".
  const soma = (caso: string) => `CAST(COALESCE(SUM(CASE WHEN ${caso} THEN p.valor ELSE 0 END), 0) AS REAL)`;

  const limitesPagamento: string[] = [];
  const valoresExtras: unknown[] = [];
  // Índices contíguos: ?1 = hoje, ?2 = limite7, ?3.. = janela de pagamento,
  // e o WHERE continua logo após o último extra — placeholders numerados do
  // SQLite exigem todos os índices 1..N preenchidos com valores.
  let indiceExtra = 3;
  if (filtros.dataInicial) {
    limitesPagamento.push(`p.data_pagamento >= ?${indiceExtra}`);
    valoresExtras.push(filtros.dataInicial);
    indiceExtra += 1;
  }
  if (filtros.dataFinal) {
    limitesPagamento.push(`p.data_pagamento <= ?${indiceExtra}`);
    valoresExtras.push(filtros.dataFinal);
    indiceExtra += 1;
  }

  const where = montarWhere(filtros, true, indiceExtra);
  const sql =
    "SELECT " +
    "COUNT(*) AS monitoradas, " +
    `COUNT(CASE WHEN ${casoPagas} THEN 1 END) AS qtd_recebidas, ${soma(casoPagas)} AS total_recebido, ` +
    `COUNT(CASE WHEN ${casoAguardando} THEN 1 END) AS qtd_pendentes, ${soma(casoAguardando)} AS total_em_aberto, ` +
    `COUNT(CASE WHEN ${casoAtrasada} THEN 1 END) AS qtd_atrasadas, ${soma(casoAtrasada)} AS total_atrasado, ` +
    "COUNT(CASE WHEN p.status = 'CANCELADA' THEN 1 END) AS qtd_canceladas, " +
    "CAST(COALESCE(SUM(CASE WHEN p.status = 'CANCELADA' THEN p.valor ELSE 0 END), 0) AS REAL) AS total_cancelado, " +
    "COUNT(CASE WHEN p.status = 'ABORTADA' THEN 1 END) AS qtd_abortadas, " +
    "CAST(COALESCE(SUM(CASE WHEN p.status = 'ABORTADA' THEN p.valor ELSE 0 END), 0) AS REAL) AS total_abortado, " +
    `COUNT(CASE WHEN ${casoPerdidas} THEN 1 END) AS qtd_perdidas, ${soma(casoPerdidas)} AS total_perdido, ` +
    `COUNT(CASE WHEN ${casoAguardando} AND p.data_vencimento < ?2 THEN 1 END) AS vencendo_7dias, ` +
    `CAST(COALESCE(SUM(CASE WHEN p.data_pagamento IS NOT NULL${limitesPagamento.length > 0 ? ` AND ${limitesPagamento.join(" AND ")}` : ""} THEN p.valor ELSE 0 END), 0) AS REAL) AS total_recebido_periodo ` +
    `FROM "Parcela" p${where.joins} WHERE ${where.where}`;

  const linhas = (await prisma.$queryRawUnsafe(
    sql,
    referencia.hoje.getTime(),
    referencia.limiteVencendo7Dias.getTime(),
    ...valoresExtras,
    ...where.params,
  )) as LinhaSQL[];
  const linha = linhas[0] ?? {};

  return {
    quantidadeMonitoradas: paraNumero(linha.monitoradas),
    quantidadeRecebidas: paraNumero(linha.qtd_recebidas),
    totalRecebido: paraNumero(linha.total_recebido),
    quantidadePendentes: paraNumero(linha.qtd_pendentes),
    totalEmAberto: paraNumero(linha.total_em_aberto),
    quantidadeAtrasadas: paraNumero(linha.qtd_atrasadas),
    totalAtrasado: paraNumero(linha.total_atrasado),
    quantidadeCanceladas: paraNumero(linha.qtd_canceladas),
    totalCancelado: paraNumero(linha.total_cancelado),
    quantidadeAbortadas: paraNumero(linha.qtd_abortadas),
    totalAbortado: paraNumero(linha.total_abortado),
    quantidadePerdidas: paraNumero(linha.qtd_perdidas),
    totalPerdido: paraNumero(linha.total_perdido),
    parcelasVencendo7Dias: paraNumero(linha.vencendo_7dias),
    totalRecebidoPeriodo: paraNumero(linha.total_recebido_periodo),
  };
}

// Buckets mensais do gráfico direto no banco: a versão anterior descia todas
// as parcelas da empresa para agrupar em JS — o custo crescia linearmente com
// o histórico. O rótulo continua vindo de toLocaleDateString para manter o
// mesmo formato de "out. de 26" já exibido.
export async function consultarBucketsMensais(
  prisma: PrismaClient,
  filtros: FiltrosAgregacao,
): Promise<BucketMensal[]> {
  const where = montarWhere(filtros, true);
  const sql =
    "SELECT strftime('%Y-%m', COALESCE(p.data_pagamento, p.data_vencimento) / 1000, 'unixepoch', 'localtime') AS chave, " +
    "CAST(COALESCE(SUM(p.valor), 0) AS REAL) AS previsto, " +
    "CAST(COALESCE(SUM(CASE WHEN p.status = 'PAGA' OR p.data_pagamento IS NOT NULL THEN p.valor ELSE 0 END), 0) AS REAL) AS recebido, " +
    "MIN(COALESCE(p.data_pagamento, p.data_vencimento)) AS data_referencia " +
    `FROM "Parcela" p${where.joins} WHERE ${where.where} AND p.status NOT IN ('CANCELADA', 'ABORTADA') ` +
    "GROUP BY chave ORDER BY chave";
  const linhas = (await prisma.$queryRawUnsafe(sql, ...where.params)) as LinhaSQL[];

  // Chave e ordem idênticas à versão JS anterior: o strftime devolve o ano
  // com quatro dígitos ("0006"), mas getFullYear() devolve sem pad ("6"), e o
  // localeCompare de "6-07" o colocaria em outro lugar do gráfico. Dados
  // históricos com ano inválido existem em produção — a ordem vista pelo
  // usuário não pode mudar na troca do agrupamento para o banco.
  return linhas
    .map((linha) => {
      const chaveSql = String(linha.chave);
      const chave = `${Number(chaveSql.slice(0, 4))}${chaveSql.slice(4)}`;
      const dataReferencia = paraData(linha.data_referencia);
      const label = (dataReferencia ?? new Date()).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      return {
        chave,
        label,
        recebido: paraNumero(linha.recebido),
        previsto: paraNumero(linha.previsto),
      };
    })
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

// Agregados por cliente da carteira (atrasadas/aguardando/pagas no período) em
// um único scan, no mesmo shape que montarCarteira já consume. Binding: ?1 =
// hoje; as condições repetem ?1 em cada métrica derivada.
export async function consultarCarteiraPorLead(
  prisma: PrismaClient,
  filtros: FiltrosAgregacao,
  referencia: { hoje: Date },
): Promise<{ grupoAtraso: GrupoAgregadoLead[]; grupoAguardando: GrupoAgregadoLead[]; grupoPagasPeriodo: GrupoAgregadoLead[] }> {
  const casoPagas = "(p.status = 'PAGA' OR (p.status NOT IN ('CANCELADA', 'ABORTADA') AND p.data_pagamento IS NOT NULL))";
  const casoAguardando = "p.status IN ('AGUARDANDO', 'ATRASADA') AND p.data_pagamento IS NULL AND p.data_vencimento >= ?1";
  const casoAtrasada = "p.status IN ('AGUARDANDO', 'ATRASADA') AND p.data_pagamento IS NULL AND p.data_vencimento < ?1";

  const where = montarWhere(filtros, true, 2);
  const sql =
    `SELECT p.id_lead, ` +
    `COUNT(CASE WHEN ${casoAtrasada} THEN 1 END) AS qtd_atrasadas, ` +
    `CAST(COALESCE(SUM(CASE WHEN ${casoAtrasada} THEN p.valor ELSE 0 END), 0) AS REAL) AS valor_atrasado, ` +
    `MIN(CASE WHEN ${casoAtrasada} THEN p.data_vencimento END) AS primeiro_atraso, ` +
    `MAX(CASE WHEN ${casoAtrasada} THEN p.quantidade_total END) AS total_plano_atrasadas, ` +
    `COUNT(CASE WHEN ${casoAguardando} THEN 1 END) AS qtd_aguardando, ` +
    `CAST(COALESCE(SUM(CASE WHEN ${casoAguardando} THEN p.valor ELSE 0 END), 0) AS REAL) AS valor_aguardando, ` +
    `MIN(CASE WHEN ${casoAguardando} THEN p.data_vencimento END) AS proximo_vencimento, ` +
    `MAX(CASE WHEN ${casoAguardando} THEN p.quantidade_total END) AS total_plano_aguardando, ` +
    `COUNT(CASE WHEN ${casoPagas} THEN 1 END) AS qtd_pagas_periodo, ` +
    `MAX(CASE WHEN ${casoPagas} THEN p.data_pagamento END) AS ultimo_pagamento, ` +
    `MAX(CASE WHEN ${casoPagas} THEN p.quantidade_total END) AS total_plano_pagas ` +
    `FROM "Parcela" p${where.joins} WHERE ${where.where} GROUP BY p.id_lead`;

  const linhas = (await prisma.$queryRawUnsafe(sql, referencia.hoje.getTime(), ...where.params)) as LinhaSQL[];

  const grupoAtraso: GrupoAgregadoLead[] = [];
  const grupoAguardando: GrupoAgregadoLead[] = [];
  const grupoPagasPeriodo: GrupoAgregadoLead[] = [];

  for (const linha of linhas) {
    if (paraNumero(linha.qtd_atrasadas) > 0) {
      grupoAtraso.push({
        id_lead: String(linha.id_lead),
        _count: { _all: paraNumero(linha.qtd_atrasadas) },
        _sum: { valor: paraNumero(linha.valor_atrasado) },
        _min: { data_vencimento: paraData(linha.primeiro_atraso) },
        _max: { quantidade_total: paraNumero(linha.total_plano_atrasadas) },
      });
    }
    if (paraNumero(linha.qtd_aguardando) > 0) {
      grupoAguardando.push({
        id_lead: String(linha.id_lead),
        _count: { _all: paraNumero(linha.qtd_aguardando) },
        _sum: { valor: paraNumero(linha.valor_aguardando) },
        _min: { data_vencimento: paraData(linha.proximo_vencimento) },
        _max: { quantidade_total: paraNumero(linha.total_plano_aguardando) },
      });
    }
    if (paraNumero(linha.qtd_pagas_periodo) > 0) {
      grupoPagasPeriodo.push({
        id_lead: String(linha.id_lead),
        _count: { _all: paraNumero(linha.qtd_pagas_periodo) },
        _max: {
          data_pagamento: paraData(linha.ultimo_pagamento),
          quantidade_total: paraNumero(linha.total_plano_pagas),
        },
      });
    }
  }

  return { grupoAtraso, grupoAguardando, grupoPagasPeriodo };
}

// Comparativo do período anterior: whereBase sem a busca textual (mesma
// semântica da versão anterior) + pagamento dentro da janela anterior.
export async function consultarTotalRecebidoAnterior(
  prisma: PrismaClient,
  filtros: FiltrosAgregacao,
  janela: { inicio: Date; fim: Date },
): Promise<number> {
  const where = montarWhere(filtros, false);
  const sql =
    `SELECT CAST(COALESCE(SUM(p.valor), 0) AS REAL) AS total FROM "Parcela" p${where.joins} ` +
    `WHERE ${where.where} AND p.data_pagamento >= ?${where.proximoIndice} AND p.data_pagamento <= ?${where.proximoIndice + 1}`;
  const linhas = (await prisma.$queryRawUnsafe(
    sql,
    ...where.params,
    janela.inicio.getTime(),
    janela.fim.getTime(),
  )) as LinhaSQL[];
  return paraNumero(linhas[0]?.total);
}
