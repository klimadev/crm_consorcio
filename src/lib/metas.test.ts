import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pdv: {
      findFirst: vi.fn(),
    },
    meta: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { validarMeta } from "@/lib/metas";

describe("validarMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.pdv.findFirst).mockResolvedValue({
      id: "pdv-1",
      nome: "Equipe Centro",
    } as never);
  });

  it("permite metas do mesmo periodo quando a medicao e diferente", async () => {
    vi.mocked(prisma.meta.findMany).mockResolvedValue([
      {
        id: "meta-1",
        tipo_meta: "VALOR",
        periodo_ref: {
          template: {
            origem_resultado: "PAGAMENTOS",
          },
        },
      },
    ] as never);

    const resultado = await validarMeta({
      id_empresa: "emp-1",
      payload: {
        titulo: "Meta de fechamentos",
        tipo: "PDV",
        tipo_meta: "VALOR",
        origem_resultado: "ESTAGIO_GANHO",
        alvo: 10000,
        periodo: "SEMANAL",
        data_inicio: "2026-04-01T00:00:00.000Z",
        data_fim: "2026-04-07T23:59:59.999Z",
        id_pdv: "pdv-1",
      },
    });

    expect(resultado).toEqual({
      ok: true,
      pdv: { id: "pdv-1", nome: "Equipe Centro" },
      teto: null,
    });
  });

  it("mantem o bloqueio quando a medicao e igual", async () => {
    vi.mocked(prisma.meta.findMany).mockResolvedValue([
      {
        id: "meta-1",
        tipo_meta: "VALOR",
        periodo_ref: {
          template: {
            origem_resultado: "PAGAMENTOS",
          },
        },
      },
    ] as never);

    const resultado = await validarMeta({
      id_empresa: "emp-1",
      payload: {
        titulo: "Meta de recebimentos",
        tipo: "PDV",
        tipo_meta: "VALOR",
        origem_resultado: "PAGAMENTOS",
        alvo: 15000,
        periodo: "SEMANAL",
        data_inicio: "2026-04-01T00:00:00.000Z",
        data_fim: "2026-04-07T23:59:59.999Z",
        id_pdv: "pdv-1",
      },
    });

    expect(resultado).toEqual({
      ok: false,
      erro: "Ja existe uma meta ativa para essa equipe nesse periodo.",
    });
  });
});
