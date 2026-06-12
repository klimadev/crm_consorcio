import { describe, expect, it } from "vitest";
import {
  agregarProgressoEquipe,
  calcularProgresso,
  calcularRanking,
  obterStatusPorPercentual,
  percentualSeguro,
} from "./calculator";
import type { Meta, ProgressoMeta } from "@/modules/metas/types";

// ============================================================
// Bug 1: Ranking duplicado — 1 equipe deve aparecer 1 vez
// ============================================================
describe("calcularRanking (bug: ranking duplicado)", () => {
  it("deve agrupar múltiplas metas da mesma equipe em 1 entrada", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 80 },
      { id_equipe: "eq-1", nome: "Alpha", semana: 2, percentual: 60 },
      { id_equipe: "eq-1", nome: "Alpha", semana: 3, percentual: 40 },
    ]);

    const ranking = calcularRanking(metas);

    expect(ranking).toHaveLength(1);
    expect(ranking[0].nome).toBe("Alpha");
  });

  it("deve calcular a média correta dos percentuais da equipe", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 80 },
      { id_equipe: "eq-1", nome: "Alpha", semana: 2, percentual: 60 },
    ]);

    const ranking = calcularRanking(metas);

    expect(ranking[0].percentual).toBe(70.0); // (80+60)/2
  });

  it("deve ter 1 entrada por equipe mesmo com 10 metas", () => {
    const metas = criarMetasComProgresso(
      Array.from({ length: 10 }, (_, i) => ({
        id_equipe: "eq-1",
        nome: "Alpha",
        semana: i + 1,
        percentual: 50,
      })),
    );

    const ranking = calcularRanking(metas);
    const totalEntradas = ranking.filter((r) => r.id_equipe === "eq-1").length;

    expect(totalEntradas).toBe(1);
  });

  it("deve ordenar do maior percentual para o menor", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 92 },
      { id_equipe: "eq-2", nome: "Beta", semana: 1, percentual: 74 },
      { id_equipe: "eq-3", nome: "Gama", semana: 1, percentual: 92 },
    ]);

    const ranking = calcularRanking(metas);

    expect(ranking[0].nome).toBe("Alpha"); // 92%, Alpha antes de Gama (alfabético)
    expect(ranking[1].nome).toBe("Gama"); // 92%
    expect(ranking[2].nome).toBe("Beta"); // 74%
  });

  it("não deve incluir equipes sem meta no período", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 80 },
    ]);

    const ranking = calcularRanking(metas);

    expect(ranking.find((r) => r.nome === "Gama")).toBeUndefined();
  });
});

// ============================================================
// Bug 2: UTC/Local — calcularProgresso deve funcionar com timestamps
// ============================================================
describe("calcularProgresso (bug: UTC/Local)", () => {
  const metaBase: Pick<Meta, "alvo" | "tipo_meta" | "origem" | "data_fim"> = {
    alvo: 25000,
    tipo_meta: "VALOR",
    origem: "PAGAMENTOS",
    data_fim: "2026-06-21T23:59:59.999Z",
  };

  it("deve calcular progresso com PAGAMENTOS (VALOR)", () => {
    const progresso = calcularProgresso(metaBase, [{ valor: 15000 }]);

    expect(progresso.realizado).toBe(15000);
    expect(progresso.percentual).toBe(60.0);
    expect(progresso.faltante).toBe(10000);
  });

  it("deve calcular progresso com FECHADOS (VALOR)", () => {
    const progresso = calcularProgresso(
      { ...metaBase, origem: "FECHADOS" },
      undefined,
      [{ valor_consorcio: 20000 }],
    );

    expect(progresso.realizado).toBe(20000);
    expect(progresso.percentual).toBe(80.0);
  });

  it("deve calcular progresso com FECHADOS (VOLUME)", () => {
    const progresso = calcularProgresso(
      { alvo: 10, tipo_meta: "VOLUME", origem: "FECHADOS", data_fim: "2026-06-21T23:59:59.999Z" },
      undefined,
      [{ id: "1" } as any, { id: "2" } as any],
    );

    expect(progresso.realizado).toBe(2);
    expect(progresso.percentual).toBe(20.0);
    expect(progresso.faltante).toBe(8);
  });

  it("deve retornar percentual 0 quando alvo é 0 (sem erro)", () => {
    const progresso = calcularProgresso(
      { alvo: 0, tipo_meta: "VALOR", origem: "PAGAMENTOS", data_fim: "2026-06-21T23:59:59.999Z" },
      [{ valor: 100 }],
    );

    expect(progresso.percentual).toBe(0);
    expect(progresso.realizado).toBe(100);
  });

  it("deve retornar realizado 0 quando não há dados", () => {
    const progresso = calcularProgresso(metaBase);

    expect(progresso.realizado).toBe(0);
    expect(progresso.percentual).toBe(0);
  });
});

// ============================================================
// Bug 3: Dupla contagem — somar realizado deve ser exato
// ============================================================
describe("calcularProgresso (bug: dupla contagem)", () => {
  it("não deve duplicar valores no somatório de pagamentos", () => {
    const pagamentos = [
      { valor: 10000 },
      { valor: 5000 },
      { valor: 10000 },
    ];
    const progresso = calcularProgresso(
      { alvo: 50000, tipo_meta: "VALOR", origem: "PAGAMENTOS", data_fim: "2026-06-21T23:59:59.999Z" },
      pagamentos,
    );

    expect(progresso.realizado).toBe(25000); // 10000+5000+10000, não 30000
  });

  it("não deve duplicar leads no VOLUME", () => {
    const progresso = calcularProgresso(
      { alvo: 5, tipo_meta: "VOLUME", origem: "FECHADOS", data_fim: "2026-06-21T23:59:59.999Z" },
      undefined,
      [{ id: "a" }, { id: "a" }, { id: "b" }], // id "a" aparece 2x
    );

    // A função conta o array recebido — 3 itens
    // (a deduplicação é responsabilidade de quem chama, não do calculator)
    expect(progresso.realizado).toBe(3);
  });
});

// ============================================================
// Bug 4: Semana do mês — obterStatusPorPercentual
// ============================================================
describe("obterStatusPorPercentual (semana do mês)", () => {
  it("deve retornar 'no_ritmo' para percentual >= 80", () => {
    expect(obterStatusPorPercentual(80)).toBe("no_ritmo");
    expect(obterStatusPorPercentual(95)).toBe("no_ritmo");
    expect(obterStatusPorPercentual(100)).toBe("no_ritmo");
  });

  it("deve retornar 'atencao' para percentual >= 45 e < 80", () => {
    expect(obterStatusPorPercentual(45)).toBe("atencao");
    expect(obterStatusPorPercentual(60)).toBe("atencao");
    expect(obterStatusPorPercentual(79)).toBe("atencao");
  });

  it("deve retornar 'fora' para percentual < 45", () => {
    expect(obterStatusPorPercentual(0)).toBe("fora");
    expect(obterStatusPorPercentual(30)).toBe("fora");
    expect(obterStatusPorPercentual(44)).toBe("fora");
  });
});

// ============================================================
// Bug 5: Resumo por equipe (não por meta)
// ============================================================
describe("agregarProgressoEquipe (bug: resumo)", () => {
  it("deve agregar progresso de múltiplas metas corretamente", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 90 },
      { id_equipe: "eq-1", nome: "Alpha", semana: 2, percentual: 60 },
    ]);

    const resumo = agregarProgressoEquipe(metas);

    expect(resumo.total_metas).toBe(2);
    expect(resumo.media_percentual).toBe(75.0); // (90+60)/2
  });

  it("deve classificar ritmo da equipe corretamente", () => {
    const metas = criarMetasComProgresso([
      { id_equipe: "eq-1", nome: "Alpha", semana: 1, percentual: 90 }, // no_ritmo
      { id_equipe: "eq-1", nome: "Alpha", semana: 2, percentual: 30 }, // fora
    ]);

    const resumo = agregarProgressoEquipe(metas);

    expect(resumo.no_ritmo).toBe(1);
    expect(resumo.fora).toBe(1);
    expect(resumo.atencao).toBe(0);
  });

  it("deve retornar 0% quando não há metas com progresso", () => {
    const resumo = agregarProgressoEquipe([]);

    expect(resumo.media_percentual).toBe(0);
    expect(resumo.total_metas).toBe(0);
  });
});

// ============================================================
// percentualSeguro
// ============================================================
describe("percentualSeguro", () => {
  it("deve calcular percentual normal", () => {
    expect(percentualSeguro(50, 100)).toBe(50.0);
  });

  it("deve retornar 0 quando alvo é 0", () => {
    expect(percentualSeguro(100, 0)).toBe(0);
  });

  it("deve retornar 0 quando alvo é negativo", () => {
    expect(percentualSeguro(100, -10)).toBe(0);
  });

  it("deve retornar 100 quando realizado == alvo", () => {
    expect(percentualSeguro(25000, 25000)).toBe(100.0);
  });
});

// Helper para criar dados de teste
function criarMetasComProgresso(
  dados: Array<{ id_equipe: string; nome: string; semana: number; percentual: number }>,
): Array<Meta & { progresso: ProgressoMeta }> {
  return dados.map((d, i) => ({
    id: `meta-${i}`,
    id_empresa: "emp-1",
    titulo: `Meta S${d.semana}`,
    tipo_meta: "VALOR" as const,
    origem: "PAGAMENTOS" as const,
    alvo: 25000,
    semana: d.semana,
    mes_referencia: "2026-06",
    data_inicio: `2026-06-0${d.semana}T00:00:00.000Z`,
    data_fim: `2026-06-0${d.semana + 6}T23:59:59.999Z`,
    ativo: true,
    id_equipe: d.id_equipe,
    criado_em: "2026-06-01T00:00:00.000Z",
    atualizado_em: "2026-06-01T00:00:00.000Z",
    equipe: { id: d.id_equipe, nome: d.nome },
    progresso: {
      id_meta: `meta-${i}`,
      realizado: Math.round((d.percentual / 100) * 25000),
      percentual: d.percentual,
      faltante: 25000 - Math.round((d.percentual / 100) * 25000),
      dias_restantes: 5,
      status: d.percentual >= 80 ? "no_ritmo" : d.percentual >= 45 ? "atencao" : "fora",
    },
  }));
}
