import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", async () => {
  const atual = await vi.importActual<typeof import("@/lib/permissoes")>("@/lib/permissoes");
  return {
    ...atual,
    exigirSessao: vi.fn(),
    whereLeadsPorPerfil: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
    },
    metaPeriodo: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/pendencias-dinamicas", () => ({
  detectarPendenciasDinamicas: vi.fn(),
}));

import { GET } from "@/app/api/resumo/route";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { detectarPendenciasDinamicas } from "@/lib/pendencias-dinamicas";

describe("GET /api/resumo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "ger-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });

    vi.mocked(whereLeadsPorPerfil).mockResolvedValue({
      id_empresa: "emp-1",
      id_funcionario: { in: ["func-1", "func-2"] },
    });

    vi.mocked(detectarPendenciasDinamicas).mockResolvedValue([]);
    vi.mocked(prisma.metaPeriodo.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("usa o escopo do perfil nas pendências e no ranking do periodo", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([
      {
        id: "lead-recente",
        criado_em: new Date("2026-04-01T12:00:00.000Z"),
        aprovado_em: new Date("2026-04-06T12:00:00.000Z"),
        valor_consorcio: 1000,
        estagio: { tipo: "GANHO", nome: "Fechado" },
        funcionario: { id: "func-1", nome: "Ana", email: "ana@test.com", id_pdv: "pdv-1" },
      },
      {
        id: "lead-antigo",
        criado_em: new Date("2026-02-15T12:00:00.000Z"),
        aprovado_em: null,
        valor_consorcio: 500,
        estagio: { tipo: "ABERTO", nome: "Novo" },
        funcionario: { id: "func-2", nome: "Bruno", email: "bruno@test.com", id_pdv: "pdv-1" },
      },
    ] as never);

    const resposta = await GET(new Request("http://localhost/api/resumo") as never);
    const json = await resposta.json();

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_empresa: "emp-1",
          id_funcionario: { in: ["func-1", "func-2"] },
        },
      }),
    );

    expect(detectarPendenciasDinamicas).toHaveBeenCalledWith(
      "emp-1",
      undefined,
      {
        id_empresa: "emp-1",
        id_funcionario: { in: ["func-1", "func-2"] },
      },
    );

    expect(json.resumo.totalNegocios).toBe(1);
    expect(json.graficos.participacaoAtendentes).toEqual([
      expect.objectContaining({
        funcionarioId: "func-1",
        quantidade: 1,
        percentual: 100,
      }),
    ]);
    expect(json.rankings.atendentes).toEqual([
      expect.objectContaining({
        funcionarioId: "func-1",
        quantidadeNegocios: 1,
        valorTotal: 1000,
      }),
    ]);
    expect(json.graficos.evolucaoSemanal).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cotas: 1,
          volume: 1000,
        }),
      ]),
    );
  });
});
