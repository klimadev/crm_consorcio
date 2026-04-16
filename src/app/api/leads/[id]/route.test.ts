import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn(),
  whereLeadsPorPerfil: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/leads/[id]/route";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("PATCH /api/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "user-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });

    vi.mocked(whereLeadsPorPerfil).mockResolvedValue({ id_empresa: "emp-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloqueia alteracao da data de venda para perfil nao EMPRESA", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      id_funcionario: "func-1",
      aprovado_em: new Date("2026-04-01T12:00:00.000Z"),
      estagio: { tipo: "GANHO" },
      funcionario: {
        id_pdv: "pdv-1",
        pdv: { id: "pdv-1", nome: "PDV 1" },
      },
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_venda: "2026-04-02" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Apenas EMPRESA pode alterar a data da venda.");
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("permite EMPRESA ajustar data de venda para lead ja vendido", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "emp-1",
        id_empresa: "emp-1",
        perfil: "EMPRESA",
        id_pdv: null,
      },
    });

    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      id_funcionario: "func-1",
      observacoes: null,
      telefone: "11999999999",
      valor_consorcio: 10000,
      motivo_perda: null,
      documento_aprovacao_url: null,
      aprovado_em: new Date("2026-04-01T12:00:00.000Z"),
      estagio: { tipo: "GANHO" },
      funcionario: {
        id_pdv: "pdv-1",
        pdv: { id: "pdv-1", nome: "PDV 1" },
      },
    } as never);

    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1", pdv: { id: "pdv-1", nome: "PDV 1" } },
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_venda: "2026-04-05" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    expect(resposta.status).toBe(200);
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aprovado_em: new Date("2026-04-05T12:00:00.000Z"),
        }),
      }),
    );
  });

  it("rejeita ajuste de data de venda quando lead nao esta vendido", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "emp-1",
        id_empresa: "emp-1",
        perfil: "EMPRESA",
        id_pdv: null,
      },
    });

    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      id_funcionario: "func-1",
      aprovado_em: null,
      estagio: { tipo: "ABERTO" },
      funcionario: {
        id_pdv: "pdv-1",
        pdv: { id: "pdv-1", nome: "PDV 1" },
      },
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_venda: "2026-04-05" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("So e permitido alterar data de venda para leads ja vendidos.");
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
