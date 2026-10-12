import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { calcularResumoParcelas, calcularStatusParcela, computarStatusParcelas } from "@/lib/financeiro/parcelas";

const hoje = new Date("2026-10-11T12:00:00.000Z");
const futuro = "2026-12-10T00:00:00.000Z";
const vencida = "2026-09-10T00:00:00.000Z";

type ParcelaBase = {
  valor: number;
  status: "AGUARDANDO" | "ATRASADA" | "PAGA" | "CANCELADA" | "ABORTADA";
  data_vencimento: string;
  data_pagamento: string | null;
};

describe("calcularStatusParcela (máquina de 5 estados)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(hoje);
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  it("reproduz estados persistidos de CANCELADA e ABORTADA sem recalcular", () => {
    expect(calcularStatusParcela({ status: "CANCELADA", data_vencimento: futuro, data_pagamento: null })).toBe("CANCELADA");
    expect(calcularStatusParcela({ status: "ABORTADA", data_vencimento: futuro, data_pagamento: null })).toBe("ABORTADA");
  });

  it("retorna PAGA por status persistido ou data de pagamento", () => {
    expect(calcularStatusParcela({ status: "PAGA", data_vencimento: futuro, data_pagamento: null })).toBe("PAGA");
    expect(calcularStatusParcela({ status: "AGUARDANDO", data_vencimento: futuro, data_pagamento: hoje.toISOString() })).toBe("PAGA");
  });

  it("deriva ATRASADA para vencida sem pagamento e AGUARDANDO para vencimento futuro", () => {
    expect(calcularStatusParcela({ status: "AGUARDANDO", data_vencimento: vencida, data_pagamento: null })).toBe("ATRASADA");
    expect(calcularStatusParcela({ status: "AGUARDANDO", data_vencimento: futuro, data_pagamento: null })).toBe("AGUARDANDO");
  });

  it("mantem ATRASADA persistida como atrasada", () => {
    expect(calcularStatusParcela({ status: "ATRASADA", data_vencimento: vencida, data_pagamento: null })).toBe("ATRASADA");
  });

  it("computa o status de todas as parcelas de uma vez", () => {
    const parcelas: ParcelaBase[] = [
      { status: "AGUARDANDO", data_vencimento: futuro, data_pagamento: null, valor: 100 },
      { status: "AGUARDANDO", data_vencimento: vencida, data_pagamento: null, valor: 100 },
      { status: "ABORTADA", data_vencimento: futuro, data_pagamento: null, valor: 100 },
    ];

    const statusComputados = computarStatusParcelas(parcelas).map((parcela) => parcela.status);
    expect(statusComputados).toEqual(["AGUARDANDO", "ATRASADA", "ABORTADA"]);
  });
});

describe("calcularResumoParcelas (segregação de churn)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(hoje);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("segrega canceladas/abortadas do atraso e calcula churn e retencao", () => {
    // Cenario US-02: parcelas 1 e 2 pagas, 3 cancelada (churn), 4 e 5 abortadas
    const resumo = calcularResumoParcelas([
      { status: "PAGA", data_vencimento: vencida, data_pagamento: vencida, valor: 500 },
      { status: "PAGA", data_vencimento: vencida, data_pagamento: vencida, valor: 500 },
      { status: "CANCELADA", data_vencimento: futuro, data_pagamento: null, valor: 400 },
      { status: "ABORTADA", data_vencimento: futuro, data_pagamento: null, valor: 400 },
      { status: "ABORTADA", data_vencimento: futuro, data_pagamento: null, valor: 400 },
    ]);

    expect(resumo.totalRecebido).toBe(1000);
    expect(resumo.quantidadeRecebidas).toBe(2);
    expect(resumo.totalAtrasado).toBe(0);
    expect(resumo.quantidadeAtrasadas).toBe(0);
    expect(resumo.totalPerdidoChurn).toBe(1200);
    expect(resumo.quantidadePerdidas).toBe(3);
    expect(resumo.totalPrevisto).toBe(1000);
    expect(resumo.taxaRetencaoParcelas).toBeCloseTo(1000 / 2200);
  });

  it("retorna taxa de retencao 1 quando nao ha pagamento nem perda", () => {
    const resumo = calcularResumoParcelas([
      { status: "AGUARDANDO", data_vencimento: futuro, data_pagamento: null, valor: 100 },
    ]);

    expect(resumo.taxaRetencaoParcelas).toBe(1);
    expect(resumo.totalPerdidoChurn).toBe(0);
  });

  it("nao conta parcela cancelada vencida como atraso ativo", () => {
    const resumo = calcularResumoParcelas([
      { status: "CANCELADA", data_vencimento: vencida, data_pagamento: null, valor: 300 },
      { status: "AGUARDANDO", data_vencimento: vencida, data_pagamento: null, valor: 300 },
    ]);

    expect(resumo.quantidadeAtrasadas).toBe(1);
    expect(resumo.totalAtrasado).toBe(300);
    expect(resumo.totalPerdidoChurn).toBe(300);
  });
});
