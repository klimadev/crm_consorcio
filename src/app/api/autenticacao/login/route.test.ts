import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    empresa: { findUnique: vi.fn() },
    funcionario: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/autenticacao", () => ({
  criarTokenSessao: vi.fn(async () => "token-falso"),
  definirCookieSessao: vi.fn(),
}));

import bcrypt from "bcryptjs";
import { POST } from "@/app/api/autenticacao/login/route";
import { criarTokenSessao, definirCookieSessao } from "@/lib/autenticacao";
import { prisma } from "@/lib/prisma";

describe("POST /api/autenticacao/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 400 quando payload e invalido", async () => {
    const request = new Request("http://localhost/api/autenticacao/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalido", senha: "123" }),
    });

    const resposta = await POST(request);
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("E-mail invalido.");
    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
  });

  it("loga como empresa com credenciais validas", async () => {
    vi.mocked(prisma.empresa.findUnique).mockResolvedValue({
      id: "empresa-1",
      email: "empresa@teste.com",
      senha_hash: "hash",
    } as never);
    vi.mocked(prisma.funcionario.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const request = new Request("http://localhost/api/autenticacao/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "empresa@teste.com", senha: "123456" }),
    });

    const resposta = await POST(request);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.perfil).toBe("EMPRESA");
    expect(criarTokenSessao).toHaveBeenCalled();
    expect(definirCookieSessao).toHaveBeenCalled();
  });
});
