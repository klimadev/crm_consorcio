import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", async () => {
  const atual = await vi.importActual<typeof import("@/lib/permissoes")>("@/lib/permissoes");
  return {
    ...atual,
    exigirSessao: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pdv: {
      findFirst: vi.fn(),
    },
    funcionario: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { PATCH, POST } from "@/app/api/funcionarios/route";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("/api/funcionarios permissoes GERENTE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("impede gerente de criar GERENTE", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "ger-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });

    const request = new Request("http://localhost/api/funcionarios", {
      method: "POST",
      body: JSON.stringify({
        nome: "Novo",
        email: "novo@teste.com",
        senha: "123456",
        cargo: "GERENTE",
        id_pdv: "pdv-1",
      }),
    });

    const resposta = await POST(request as never);
    expect(resposta.status).toBe(403);
  });

  it("valida restricao de PDV em acao em lote para gerente", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "ger-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });

    vi.mocked(prisma.pdv.findFirst).mockResolvedValue({ id: "pdv-2" } as never);
    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([
      {
        id: "func-1",
        nome: "Colaborador",
        cargo: "COLABORADOR",
        id_pdv: "pdv-1",
        ativo: true,
      },
    ] as never);

    const request = new Request("http://localhost/api/funcionarios", {
      method: "PATCH",
      body: JSON.stringify({
        acao: "ALTERAR_PDV",
        ids: ["func-1"],
        id_pdv: "pdv-2",
      }),
    });

    const resposta = await PATCH(request as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Gerentes nao podem mover colaboradores para outro PDV.");
  });
});
