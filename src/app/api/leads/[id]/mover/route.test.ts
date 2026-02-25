import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    estagioFunil: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/whatsapp-automations", () => ({
  executarAutomacoesLeadStageChanged: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "@/app/api/leads/[id]/mover/route";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("PATCH /api/leads/[id]/mover", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "func-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });
  });

  it("retorna erro quando id_estagio nao e enviado", async () => {
    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("Destino obrigatorio.");
  });

  it("exige motivo ao mover para perdido", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ 
      id: "lead-1",
      estagio: { id: "estagio-1", nome: "Novo" }
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst).mockResolvedValue({
      id: "estagio-perdido",
      tipo: "PERDIDO",
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-perdido" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("Motivo de perda e obrigatorio.");
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("retorna no-op quando lead ja esta no destino", async () => {
    // Lead already in the destination stage
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ 
      id: "lead-1",
      estagio: { id: "estagio-1", nome: "Novo" }
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst).mockResolvedValue({
      id: "estagio-1", // Same as current stage
      tipo: "NOVO",
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-1" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.noop).toBe(true);
    expect(json.mensagem).toBe("Lead ja esta neste estagio.");
    // Should not call update since it's a no-op
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
