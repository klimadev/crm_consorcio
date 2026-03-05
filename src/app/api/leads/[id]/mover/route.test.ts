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
  cancelarAgendamentosPorLead: vi.fn().mockResolvedValue(undefined),
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
      estagio: { id: "estagio-1", nome: "Novo", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: null,
      aprovado_por: null,
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
      estagio: { id: "estagio-1", nome: "Novo", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: null,
      aprovado_por: null,
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

  it("redireciona COLABORADOR para Pré Aprovação ao tentar GANHO sem aprovação", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "func-1",
        id_empresa: "emp-1",
        perfil: "COLABORADOR",
        id_pdv: "pdv-1",
      },
    });

    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      estagio: { id: "estagio-1", nome: "Proposta", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: null,
      aprovado_por: null,
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst)
      .mockResolvedValueOnce({
        id: "estagio-ganho",
        tipo: "GANHO",
        nome: "Fechado",
      } as never)
      .mockResolvedValueOnce({
        id: "estagio-pre",
        tipo: "ABERTO",
        nome: "Pré Aprovação",
      } as never);

    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      id_estagio: "estagio-pre",
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-ganho" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.mensagem).toContain("Pré Aprovação");
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_estagio: "estagio-pre" }),
      }),
    );
  });

  it("permite mover para GANHO quando lead está aprovado", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      nome: "Lead",
      telefone: "11999999999",
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: new Date(),
      aprovado_por: "ger-1",
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst).mockResolvedValue({
      id: "estagio-ganho",
      nome: "Fechado",
      tipo: "GANHO",
    } as never);

    vi.mocked(prisma.lead.update).mockResolvedValue({ id: "lead-1" } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-ganho" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    expect(resposta.status).toBe(200);
    expect(prisma.lead.update).toHaveBeenCalled();
  });

  it("mantem em Pré Aprovação ao tentar Fechado sem aprovação", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: null,
      aprovado_por: null,
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst)
      .mockResolvedValueOnce({
        id: "estagio-ganho",
        tipo: "GANHO",
        nome: "Fechado",
      } as never)
      .mockResolvedValueOnce({
        id: "estagio-1",
        tipo: "ABERTO",
        nome: "Pré Aprovação",
      } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-ganho" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    const json = await resposta.json();
    expect(resposta.status).toBe(200);
    expect(json.noop).toBe(true);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it("redireciona para Pré Aprovação ao tentar ir direto para Fechado", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      estagio: { id: "estagio-proposta", nome: "Proposta", tipo: "ABERTO" },
      funcionario: { id_pdv: "pdv-1" },
      aprovado_em: null,
      aprovado_por: null,
      nome: "Lead",
      telefone: "11999999999",
    } as never);

    vi.mocked(prisma.estagioFunil.findFirst)
      .mockResolvedValueOnce({
        id: "estagio-ganho",
        tipo: "GANHO",
        nome: "Fechado",
      } as never)
      .mockResolvedValueOnce({
        id: "estagio-pre",
        tipo: "ABERTO",
        nome: "Pré Aprovação",
      } as never);

    vi.mocked(prisma.lead.update).mockResolvedValue({ id: "lead-1", id_estagio: "estagio-pre" } as never);

    const request = new Request("http://localhost/api/leads/lead-1/mover", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_estagio: "estagio-ganho" }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.mensagem).toContain("pendência de análise da EMPRESA");
    expect(prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_estagio: "estagio-pre" }),
      }),
    );
  });
});
