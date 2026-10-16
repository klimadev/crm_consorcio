import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  consultarBucketsMensais,
  consultarCarteiraPorLead,
  consultarResumoAgregado,
  consultarTotalRecebidoAnterior,
  type FiltrosAgregacao,
} from "./consultas-recebimentos";

// As consultas montam SQL com placeholders numerados e coerções de tipo; os
// testes capturam (sql, params) sem tocar o banco e validam o contrato:
// binds de data sempre em epoch ms, curingas no LIKE, CAST AS REAL nos sums,
// e o mapeamento das linhas cruas (BigInt/INTEGER/NULL) para os shapes da UI.

const HOJE = new Date("2026-10-12T00:00:00.000");
const LIMITE_7_DIAS = new Date("2026-10-20T00:00:00.000");

function criarPrismaMock(resposta: unknown = [{}]) {
  return {
    $queryRawUnsafe: vi.fn<(sql: string, ...valores: unknown[]) => Promise<unknown>>().mockResolvedValue(resposta),
  } as unknown as PrismaClient;
}

function filtrosPadrao(extras: Partial<FiltrosAgregacao> = {}): FiltrosAgregacao {
  return {
    idEmpresa: "empresa-1",
    dataInicial: null,
    dataFinal: null,
    busca: "",
    idFuncionario: null,
    idPdv: null,
    ...extras,
  };
}

describe("consultarResumoAgregado", () => {
  it("binda hoje e limite como epoch ms e usa o mesmo ?1 em aguardando e atrasada", async () => {
    const prisma = criarPrismaMock([
      {
        monitoradas: BigInt(10),
        qtd_recebidas: BigInt(4),
        total_recebido: 400.5,
        qtd_pendentes: BigInt(3),
        total_em_aberto: 300.25,
        qtd_atrasadas: BigInt(3),
        total_atrasado: 299.25,
        qtd_canceladas: BigInt(0),
        total_cancelado: 0,
        qtd_abortadas: BigInt(1),
        total_abortado: 100,
        qtd_perdidas: BigInt(1),
        total_perdido: 100,
        vencendo_7dias: BigInt(2),
        total_recebido_periodo: 400.5,
      },
    ]);

    const resumo = await consultarResumoAgregado(prisma, filtrosPadrao(), {
      hoje: HOJE,
      limiteVencendo7Dias: LIMITE_7_DIAS,
    });

    const [sql, ...params] = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];

    // Binds de data sempre em número: Date viraria string ISO na engine e
    // "INTEGER >= TEXT" no SQLite nunca casa.
    expect(params[0]).toBe(HOJE.getTime());
    expect(params[1]).toBe(LIMITE_7_DIAS.getTime());
    expect(params[2]).toBe("empresa-1");
    // ?1 reutilizado por aguardando/atrasada, ?2 no vencendo 7 dias.
    expect(String(sql)).toContain("data_vencimento >= ?1");
    expect(String(sql)).toContain("data_vencimento < ?1");
    expect(String(sql)).toContain("data_vencimento < ?2");
    // CAST AS REAL: soma inteira fecharia como INTEGER e quebraria o unpack.
    expect(String(sql)).toContain("AS REAL) AS total_recebido");

    expect(resumo).toEqual({
      quantidadeMonitoradas: 10,
      quantidadeRecebidas: 4,
      totalRecebido: 400.5,
      quantidadePendentes: 3,
      totalEmAberto: 300.25,
      quantidadeAtrasadas: 3,
      totalAtrasado: 299.25,
      quantidadeCanceladas: 0,
      totalCancelado: 0,
      quantidadeAbortadas: 1,
      totalAbortado: 100,
      quantidadePerdidas: 1,
      totalPerdido: 100,
      parcelasVencendo7Dias: 2,
      totalRecebidoPeriodo: 400.5,
    });
  });

  it("junta Lead/Funcionario/Pdv apenas quando a busca exige", async () => {
    const prismaComBusca = criarPrismaMock();
    await consultarResumoAgregado(
      prismaComBusca,
      filtrosPadrao({ dataInicial: new Date("2026-07-01"), dataFinal: new Date("2026-09-30"), busca: "maria" }),
      { hoje: HOJE, limiteVencendo7Dias: LIMITE_7_DIAS },
    );

    const [sqlComBusca, ...paramsComBusca] = vi.mocked(prismaComBusca.$queryRawUnsafe).mock.calls[0];
    expect(String(sqlComBusca)).toContain('LEFT JOIN "Lead" l');
    expect(String(sqlComBusca)).toContain('LEFT JOIN "Funcionario" f');
    expect(String(sqlComBusca)).toContain('LEFT JOIN "Pdv" pdv');
    expect(String(sqlComBusca)).toContain("LIKE");
    // Curingas fazem parte do valor bindado, nunca da string SQL.
    expect(String(sqlComBusca)).not.toContain("maria");
    expect(paramsComBusca).toContain("%maria%");

    const prismaSemFiltro = criarPrismaMock();
    await consultarResumoAgregado(prismaSemFiltro, filtrosPadrao(), {
      hoje: HOJE,
      limiteVencendo7Dias: LIMITE_7_DIAS,
    });
    const [sqlSemFiltro] = vi.mocked(prismaSemFiltro.$queryRawUnsafe).mock.calls[0];
    expect(String(sqlSemFiltro)).not.toContain("LEFT JOIN");
  });
});

describe("consultarBucketsMensais", () => {
  it("normaliza o ano sem padding e ordena por localeCompare como a versão JS", async () => {
    const msAno6 = new Date("0006-07-21T03:06:28.000Z").getTime();
    const prisma = criarPrismaMock([
      { chave: "0006-07", previsto: 1250, recebido: 1250, data_referencia: msAno6 },
      { chave: "2026-07", previsto: 900, recebido: 500, data_referencia: 1782864000000 },
      { chave: "2026-02", previsto: 100, recebido: 100, data_referencia: 1770249600000 },
    ]);

    const buckets = await consultarBucketsMensais(prisma, filtrosPadrao());

    // Chave "0006-07" vira "6-07": getFullYear() não faz padding e o
    // localeCompare da chave legada posiciona anos estranhos no fim do
    // gráfico — a ordem que o usuário já conhece não pode mudar.
    expect(buckets.map((bucket) => bucket.chave)).toEqual(["2026-02", "2026-07", "6-07"]);
    expect(buckets[2]?.label).toContain("jul");
    expect(buckets[0]?.recebido).toBe(100);
  });
});

describe("consultarCarteiraPorLead", () => {
  it("mapeia linhas cruas para os três grupos e ignora contadores zerados", async () => {
    const prisma = criarPrismaMock([
      {
        id_lead: "lead-1",
        qtd_atrasadas: BigInt(2),
        valor_atrasado: 250.5,
        primeiro_atraso: 1767225600000,
        total_plano_atrasadas: BigInt(12),
        qtd_aguardando: BigInt(1),
        valor_aguardando: 125,
        proximo_vencimento: 1782864000000,
        total_plano_aguardando: BigInt(12),
        qtd_pagas_periodo: BigInt(5),
        ultimo_pagamento: 1782864000000,
        total_plano_pagas: BigInt(12),
      },
      {
        id_lead: "lead-2",
        qtd_atrasadas: BigInt(0),
        valor_atrasado: 0,
        primeiro_atraso: null,
        total_plano_atrasadas: null,
        qtd_aguardando: BigInt(3),
        valor_aguardando: 375.75,
        proximo_vencimento: 1782864000000,
        total_plano_aguardando: BigInt(10),
        qtd_pagas_periodo: BigInt(0),
        ultimo_pagamento: null,
        total_plano_pagas: null,
      },
    ]);

    const { grupoAtraso, grupoAguardando, grupoPagasPeriodo } = await consultarCarteiraPorLead(
      prisma,
      filtrosPadrao(),
      { hoje: HOJE },
    );

    expect(grupoAtraso).toHaveLength(1);
    expect(grupoAguardando).toHaveLength(2);
    expect(grupoPagasPeriodo).toHaveLength(1);

    expect(grupoAtraso[0]).toEqual({
      id_lead: "lead-1",
      _count: { _all: 2 },
      _sum: { valor: 250.5 },
      _min: { data_vencimento: new Date(1767225600000) },
      _max: { quantidade_total: 12 },
    });
    expect(grupoPagasPeriodo[0]?._max?.data_pagamento).toEqual(new Date(1782864000000));
    expect(grupoAguardando[1]?._min?.data_vencimento).toEqual(new Date(1782864000000));
  });
});

describe("consultarTotalRecebidoAnterior", () => {
  it("ignora a busca textual e binda a janela anterior em epoch ms", async () => {
    const prisma = criarPrismaMock([{ total: 1234.5 }]);
    const inicio = new Date("2026-04-01T00:00:00.000");
    const fim = new Date("2026-06-30T00:00:00.000");

    const total = await consultarTotalRecebidoAnterior(prisma, filtrosPadrao({ busca: "maria" }), {
      inicio,
      fim,
    });

    const [sql, ...params] = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0];
    expect(String(sql)).not.toContain("LIKE");
    expect(params[params.length - 2]).toBe(inicio.getTime());
    expect(params[params.length - 1]).toBe(fim.getTime());
    expect(total).toBe(1234.5);
  });
});
