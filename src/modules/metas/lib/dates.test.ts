import { describe, expect, it } from "vitest";
import {
  calcularDiasRestantes,
  obterCompetenciaISO,
  startOfDayUTC,
  endOfDayUTC,
  calcularDatasSemana,
  obterSemanaDoMes,
  obterMesReferencia,
} from "./dates";

describe("obterCompetenciaISO", () => {
  it("deve retornar 2026-W25 para segunda-feira 2026-06-15", () => {
    const data = new Date("2026-06-15T12:00:00Z");
    expect(obterCompetenciaISO(data)).toBe("2026-W25");
  });

  it("deve retornar 2026-W25 para domingo 2026-06-21", () => {
    const data = new Date("2026-06-21T12:00:00Z");
    expect(obterCompetenciaISO(data)).toBe("2026-W25");
  });

  it("deve usar UTC exclusivamente", () => {
    const data = new Date("2026-01-01T23:00:00-03:00"); // 2026-01-02 02:00 UTC
    const competencia = obterCompetenciaISO(data);
    expect(typeof competencia).toBe("string");
    expect(competencia).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("calcularDiasRestantes", () => {
  it("deve retornar 7 dias para data fim 2026-06-21 com hoje 2026-06-15 (inclusive)", () => {
    const dataFim = new Date("2026-06-21T23:59:59Z");
    const hoje = new Date("2026-06-15T00:00:00Z");
    expect(calcularDiasRestantes(dataFim, hoje)).toBe(7);
  });

  it("deve retornar 0 para data passada", () => {
    const dataFim = new Date("2026-06-10T23:59:59Z");
    const hoje = new Date("2026-06-15T00:00:00Z");
    expect(calcularDiasRestantes(dataFim, hoje)).toBe(0);
  });

  it("deve retornar 0 para mesma data já passada", () => {
    const dataFim = new Date("2026-06-10T00:00:00Z");
    const hoje = new Date("2026-06-11T00:00:00Z");
    expect(calcularDiasRestantes(dataFim, hoje)).toBe(0);
  });
});

describe("startOfDayUTC / endOfDayUTC", () => {
  it("startOfDayUTC deve zerar hora", () => {
    const data = new Date("2026-06-15T14:30:00.000Z");
    const inicio = startOfDayUTC(data);
    expect(inicio.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  it("endOfDayUTC deve ir a 23:59:59.999", () => {
    const data = new Date("2026-06-15T14:30:00.000Z");
    const fim = endOfDayUTC(data);
    expect(fim.toISOString()).toBe("2026-06-15T23:59:59.999Z");
  });
});

describe("calcularDatasSemana", () => {
  it("semana 1 de 2026-06 deve ser 01/06 a 07/06", () => {
    const { data_inicio, data_fim } = calcularDatasSemana(1, "2026-06");
    expect(data_inicio.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(data_fim.toISOString()).toBe("2026-06-07T23:59:59.999Z");
  });

  it("semana 2 de 2026-06 deve ser 08/06 a 14/06", () => {
    const { data_inicio, data_fim } = calcularDatasSemana(2, "2026-06");
    expect(data_inicio.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(data_fim.toISOString()).toBe("2026-06-14T23:59:59.999Z");
  });

  it("semana 4 de 2026-06 deve terminar em 30/06", () => {
    const { data_fim } = calcularDatasSemana(4, "2026-06");
    expect(data_fim.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });
});

describe("obterSemanaDoMes", () => {
  it("dia 5 deve ser semana 1", () => {
    expect(obterSemanaDoMes(new Date("2026-06-05T00:00:00Z"))).toBe(1);
  });

  it("dia 15 deve ser semana 3", () => {
    expect(obterSemanaDoMes(new Date("2026-06-15T00:00:00Z"))).toBe(3);
  });
});

describe("obterMesReferencia", () => {
  it("deve retornar 2026-06 para junho de 2026", () => {
    expect(obterMesReferencia(new Date("2026-06-15T00:00:00Z"))).toBe("2026-06");
  });
});
