import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn<() => Promise<unknown>>(),
  respostaSemPermissao: vi.fn<() => Response>(() => new Response(JSON.stringify({ erro: "Sem permissao." }), { status: 403 })),
  whereLeadsPorPerfil: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parcela: {
      findFirst: vi.fn<() => Promise<unknown>>(),
      update: vi.fn<() => Promise<unknown>>(),
    },
    $transaction: vi.fn<() => Promise<unknown>>(),
  },
}));

import { PATCH as patchCancelar } from "@/app/api/parcelas/[id]/cancelar/route";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

function criarRequisicao(body: unknown, id = "parcela-3") {
  return new Request(`http://localhost/api/parcelas/${id}/cancelar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const parcelaPlano5 = {
  id: "parcela-3",
  id_empresa: "emp-1",
  id_lead: "lead-1",
  numero_parcela: 3,
  quantidade_total: 5,
  valor: 400,
  status: "AGUARDANDO",
  data_pagamento: null,
};

describe("PATCH /api/parcelas/[id]/cancelar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T12:00:00.000Z"));

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "admin-1",
        id_empresa: "emp-1",
        perfil: "EMPRESA",
        id_pdv: null,
      },
    } as never);

    vi.mocked(whereLeadsPorPerfil).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejeita COLABORADOR sem permissao", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: { id_usuario: "col-1", id_empresa: "emp-1", perfil: "COLABORADOR", id_pdv: "pdv-1" },
    } as never);

    const resposta = await patchCancelar(criarRequisicao({ modo: "PONTUAL" }) as never, params("parcela-3"));
    expect(resposta.status).toBe(403);
  });

  it("retorna 404 quando a parcela nao pertence a empresa do operador (isolamento multi-tenant)", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue(null);

    const resposta = await patchCancelar(criarRequisicao({ modo: "SUBSEQUENTES" }) as never, params("parcela-3"));

    expect(resposta.status).toBe(404);
    expect(prisma.parcela.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "parcela-3", id_empresa: "emp-1" }),
      }),
    );
  });

  it("retorna 400 ao tentar cancelar parcela paga", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({
      ...parcelaPlano5,
      status: "PAGA",
      data_pagamento: "2026-09-10T00:00:00.000Z",
    } as never);

    const resposta = await patchCancelar(criarRequisicao({ modo: "PONTUAL" }) as never, params("parcela-3"));
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("Parcela paga não pode ser cancelada.");
  });

  it("cancela apenas a parcela no modo PONTUAL", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({ ...parcelaPlano5 } as never);
    vi.mocked(prisma.parcela.update).mockResolvedValue({ ...parcelaPlano5, status: "CANCELADA" } as never);

    const resposta = await patchCancelar(
      criarRequisicao({ modo: "PONTUAL", motivo: "Isencao pontual de acordo" }) as never,
      params("parcela-3"),
    );
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json).toEqual({ ok: true, canceladas: 1, abortadas: 0 });
    expect(prisma.parcela.update).toHaveBeenCalledWith({
      where: { id: "parcela-3" },
      data: expect.objectContaining({
        status: "CANCELADA",
        motivo_cancelamento: "Isencao pontual de acordo",
        cancelado_por: "admin-1",
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marca a parcela K como CANCELADA e aborta as subsequentes nao pagas no modo SUBSEQUENTES", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({ ...parcelaPlano5 } as never);
    const updateMany = vi.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 2 });
    vi.mocked(prisma.$transaction).mockImplementation(
      async (callback: unknown) => (callback as (tx: unknown) => Promise<unknown>)({
        parcela: { update: vi.fn<() => Promise<unknown>>(), updateMany },
      }),
    );

    const resposta = await patchCancelar(
      criarRequisicao({ modo: "SUBSEQUENTES", motivo: "Inadimplencia definitiva do consorciado" }) as never,
      params("parcela-3"),
    );
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json).toEqual({ ok: true, canceladas: 1, abortadas: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id_empresa: "emp-1",
        id_lead: "lead-1",
        numero_parcela: { gt: 3 },
        status: { notIn: ["PAGA", "CANCELADA"] },
      },
      data: expect.objectContaining({
        status: "ABORTADA",
        motivo_cancelamento: "Inadimplencia definitiva do consorciado",
        cancelado_por: "admin-1",
      }),
    });
  });

  it("rejeita payload com modo invalido (validacao Zod)", async () => {
    const resposta = await patchCancelar(criarRequisicao({ modo: "TODAS" }) as never, params("parcela-3"));

    expect(resposta.status).toBe(400);
  });
});
