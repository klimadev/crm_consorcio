import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn(),
  podeAprovarLead: vi.fn(),
  podeGerenciarRecursoNoPdv: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/leads/[id]/aprovar/route";
import { exigirSessao, podeAprovarLead, podeGerenciarRecursoNoPdv } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("POST /api/leads/[id]/aprovar", () => {
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

    vi.mocked(podeAprovarLead).mockReturnValue(true);
    vi.mocked(podeGerenciarRecursoNoPdv).mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejeita gerente tentando aprovar lead", async () => {
    vi.mocked(podeAprovarLead).mockReturnValue(false);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Apenas ADMIN da empresa pode aprovar leads.");
  });

  it("rejeita gerente tentando aprovar lead de outro PDV", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-2" },
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      documento_aprovacao_url: "https://exemplo.com/doc.pdf",
      aprovado_em: null,
    } as never);
    vi.mocked(podeGerenciarRecursoNoPdv).mockReturnValue(false);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Sem permissao para aprovar lead de outro PDV.");
  });

  it("rejeita COLABORADOR tentando aprovar", async () => {
    vi.mocked(podeAprovarLead).mockReturnValue(false);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Apenas ADMIN da empresa pode aprovar leads.");
  });

  it("rejeita lead fora de Pré Aprovação", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1" },
      estagio: { id: "estagio-1", nome: "Proposta", tipo: "ABERTO" },
      documento_aprovacao_url: "https://exemplo.com/doc.pdf",
      aprovado_em: null,
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    expect(resposta.status).toBe(400);
  });

  it("rejeita lead sem documento de aprovação", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1" },
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      documento_aprovacao_url: null,
      aprovado_em: null,
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    expect(resposta.status).toBe(400);
  });

  it("aprova lead com sucesso", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1" },
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      documento_aprovacao_url: "https://exemplo.com/doc.pdf",
      aprovado_em: null,
    } as never);

    vi.mocked(prisma.lead.update).mockResolvedValue({
      id: "lead-1",
      aprovado_por: "ger-1",
      aprovado_em: new Date(),
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_aprovacao: "2026-03-30" }),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });

    expect(resposta.status).toBe(200);
    expect(prisma.lead.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        aprovado_em: new Date("2026-03-30T12:00:00.000Z"),
      }),
    }));
  });

  it("rejeita data de aprovação no futuro", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1" },
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      documento_aprovacao_url: "https://exemplo.com/doc.pdf",
      aprovado_em: null,
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_aprovacao: "2026-05-30" }),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    expect(resposta.status).toBe(400);
  });

  it("retorna idempotente se lead já aprovado", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      funcionario: { id_pdv: "pdv-1" },
      estagio: { id: "estagio-1", nome: "Pré Aprovação", tipo: "ABERTO" },
      documento_aprovacao_url: "https://exemplo.com/doc.pdf",
      aprovado_em: new Date(),
    } as never);

    const request = new Request("http://localhost/api/leads/lead-1/aprovar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const resposta = await POST(request as never, { params: Promise.resolve({ id: "lead-1" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.mensagem).toBe("Lead já foi aprovado.");
  });
});
