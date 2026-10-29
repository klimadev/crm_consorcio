import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  podeAdicionarColaboradorNoPdv,
  podeEditarFuncionarioNoPdv,
  podeGerenciarRecursoNoPdv,
  whereLeadsPorPerfil,
} from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe(whereLeadsPorPerfil, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filtra colaborador por empresa e usuario (proprios leads + transferencias pendentes recebidas)", async () => {
    expect.hasAssertions();
    vi.spyOn(prisma.transferenciaLead, "findMany").mockResolvedValue([]);

    const where = await whereLeadsPorPerfil({
      id_usuario: "func-1",
      id_empresa: "emp-1",
      perfil: "COLABORADOR",
      id_pdv: "pdv-1",
    });

    expect(where).toStrictEqual({
      id_empresa: "emp-1",
      OR: [
        { id_funcionario: "func-1" },
      ],
    });
  });

  it("filtra colaborador incluindo leads com transferencia pendente recebida", async () => {
    expect.hasAssertions();
    vi.spyOn(prisma.transferenciaLead, "findMany").mockResolvedValue([
      { id_lead: "lead-1" },
      { id_lead: "lead-2" },
    ]);

    const where = await whereLeadsPorPerfil({
      id_usuario: "func-1",
      id_empresa: "emp-1",
      perfil: "COLABORADOR",
      id_pdv: "pdv-1",
    });

    expect(where).toStrictEqual({
      id_empresa: "emp-1",
      OR: [
        { id_funcionario: "func-1" },
        { id: { in: ["lead-1", "lead-2"] } },
      ],
    });
  });

  it("filtra gerente por PDV", async () => {
    expect.hasAssertions();
    vi.spyOn(prisma.funcionario, "findMany").mockResolvedValue([
      { id: "func-1", id_empresa: "emp-1", id_pdv: "pdv-1", nome: "Func 1", email: "func1@test.com", senha_hash: "hash", cargo: "VENDEDOR", ativo: true, criado_em: new Date(), atualizado_em: new Date(), inativado_em: null },
      { id: "func-2", id_empresa: "emp-1", id_pdv: "pdv-1", nome: "Func 2", email: "func2@test.com", senha_hash: "hash", cargo: "VENDEDOR", ativo: true, criado_em: new Date(), atualizado_em: new Date(), inativado_em: null },
    ]);

    const where = await whereLeadsPorPerfil({
      id_usuario: "gerente-1",
      id_empresa: "emp-1",
      perfil: "GERENTE",
      id_pdv: "pdv-1",
    });

    expect(where).toStrictEqual({ 
      id_empresa: "emp-1", 
      id_funcionario: { in: ["func-1", "func-2"] } 
    });
  });
});

describe("permissoes PDV para gerente", () => {
  const sessaoGerente = {
    id_usuario: "ger-1",
    id_empresa: "emp-1",
    perfil: "GERENTE" as const,
    id_pdv: "pdv-1",
  };

  it("impede gerente de criar GERENTE ou ADMINISTRADOR", () => {
    expect.hasAssertions();
    expect(podeAdicionarColaboradorNoPdv(sessaoGerente, "GERENTE", "pdv-1")).toBeFalsy();
    expect(podeAdicionarColaboradorNoPdv(sessaoGerente, "ADMINISTRADOR", "pdv-1")).toBeFalsy();
    expect(podeAdicionarColaboradorNoPdv(sessaoGerente, "COLABORADOR", "pdv-1")).toBeTruthy();
  });

  it("impede gerente de acessar recurso em outro PDV", () => {
    expect.hasAssertions();
    expect(podeGerenciarRecursoNoPdv(sessaoGerente, "pdv-2")).toBeFalsy();
    expect(podeGerenciarRecursoNoPdv(sessaoGerente, "pdv-1")).toBeTruthy();
  });

  it("impede gerente de alterar cargo ou PDV de colaborador", () => {
    expect.hasAssertions();
    expect(
      podeEditarFuncionarioNoPdv(sessaoGerente, "pdv-1", "COLABORADOR", "COLABORADOR", "pdv-1"),
    ).toBeTruthy();

    expect(
      podeEditarFuncionarioNoPdv(sessaoGerente, "pdv-1", "COLABORADOR", "GERENTE", "pdv-1"),
    ).toBeFalsy();

    expect(
      podeEditarFuncionarioNoPdv(sessaoGerente, "pdv-1", "COLABORADOR", "COLABORADOR", "pdv-2"),
    ).toBeFalsy();
  });
});
