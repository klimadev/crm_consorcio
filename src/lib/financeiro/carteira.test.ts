import { describe, expect, it } from "vitest";

import { montarCarteira, type GrupoCarteira } from "@/lib/financeiro/carteira";

const leads = [
  { id: "lead-1", nome: "João Silva", telefone: "11999990001" },
  { id: "lead-2", nome: "Maria Souza", telefone: "11999990002" },
  { id: "lead-3", nome: "Carlos Lima", telefone: "11999990003" },
];

const grupo = (idLead: string, overrides: Partial<GrupoCarteira> = {}): GrupoCarteira => ({
  id_lead: idLead,
  _count: { _all: 1 },
  ...overrides,
});

describe("montarCarteira (carteira por cliente)", () => {
  it("prioriza clientes em atraso ordenados por valor em risco", () => {
    const carteira = montarCarteira({
      leads,
      grupoAtraso: [
        grupo("lead-2", { _count: { _all: 1 }, _sum: { valor: 800 }, _max: { quantidade_total: 60 } }),
        grupo("lead-1", { _count: { _all: 3 }, _sum: { valor: 4280 }, _max: { quantidade_total: 60 } }),
      ],
      grupoAguardando: [
        grupo("lead-2", { _count: { _all: 1 }, _sum: { valor: 800 }, _min: { data_vencimento: new Date("2026-10-15T00:00:00.000Z") }, _max: { quantidade_total: 60 } }),
      ],
      grupoPagasPeriodo: [],
      pagasGlobais: { "lead-1": 12, "lead-2": 40 },
    });

    expect(carteira.map((c) => c.id_lead)).toEqual(["lead-1", "lead-2"]);
    expect(carteira[0]).toMatchObject({
      estado: "em_atraso",
      valorEmRisco: 4280,
      quantidadeAtrasadas: 3,
      pagasPlano: 12,
      totalPlano: 60,
      nome: "João Silva",
    });
  });

  it("marca como em_dia quem tem pendência futura e nenhum atraso", () => {
    const carteira = montarCarteira({
      leads,
      grupoAtraso: [],
      grupoAguardando: [
        grupo("lead-3", { _sum: { valor: 800 }, _min: { data_vencimento: new Date("2026-10-20T00:00:00.000Z") } }),
        grupo("lead-2", { _sum: { valor: 500 }, _min: { data_vencimento: new Date("2026-10-15T00:00:00.000Z") } }),
      ],
      grupoPagasPeriodo: [],
      pagasGlobais: {},
    });

    expect(carteira.map((c) => c.estado)).toEqual(["em_dia", "em_dia"]);
    // mais urgente primeiro: vencimento 15/10 vem antes de 20/10
    expect(carteira.map((c) => c.id_lead)).toEqual(["lead-2", "lead-3"]);
    expect(carteira[0]).toMatchObject({ quantidadePendentes: 1, valorPendente: 500 });
  });

  it("marca como pago_no_periodo quem não tem pendência no filtro mas pagou", () => {
    const carteira = montarCarteira({
      leads,
      grupoAtraso: [],
      grupoAguardando: [],
      grupoPagasPeriodo: [
        grupo("lead-3", { _max: { data_pagamento: new Date("2026-10-10T00:00:00.000Z"), quantidade_total: 24 } }),
        grupo("lead-1", { _max: { data_pagamento: new Date("2026-10-12T00:00:00.000Z"), quantidade_total: 10 } }),
      ],
      pagasGlobais: { "lead-3": 8 },
    });

    expect(carteira.map((c) => c.estado)).toEqual(["pago_no_periodo", "pago_no_periodo"]);
    // pagamento mais recente primeiro
    expect(carteira[0].id_lead).toBe("lead-1");
    expect(carteira[0]).toMatchObject({ ultimoPagamento: "2026-10-12T00:00:00.000Z", totalPlano: 10 });
    expect(carteira[1].pagasPlano).toBe(8);
  });

  it("usa fallback honesto quando o lead não vem na listagem", () => {
    const carteira = montarCarteira({
      leads: [],
      grupoAtraso: [grupo("lead-fantasma", { _sum: { valor: 300 } })],
      grupoAguardando: [],
      grupoPagasPeriodo: [],
      pagasGlobais: {},
    });

    expect(carteira[0]).toMatchObject({ nome: "Cliente", telefone: "", valorEmRisco: 300 });
  });

  it("devolve carteira vazia sem grupos", () => {
    expect(
      montarCarteira({ leads, grupoAtraso: [], grupoAguardando: [], grupoPagasPeriodo: [], pagasGlobais: {} }),
    ).toEqual([]);
  });
});
