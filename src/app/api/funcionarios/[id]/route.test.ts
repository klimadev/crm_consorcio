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
    funcionario: {
      findFirst: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/funcionarios/[id]/route";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("PATCH /api/funcionarios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "ger-1",
        id_empresa: "emp-1",
        perfil: "GERENTE",
        id_pdv: "pdv-1",
      },
    });
  });

  it("impede gerente de editar colaborador de outro PDV", async () => {
    vi.mocked(prisma.funcionario.findFirst).mockResolvedValue({
      id: "func-2",
      nome: "Fulano",
      email: "fulano@teste.com",
      cargo: "COLABORADOR",
      id_pdv: "pdv-2",
    } as never);

    const request = new Request("http://localhost/api/funcionarios/func-2", {
      method: "PATCH",
      body: JSON.stringify({
        nome: "Fulano da Silva",
        email: "fulano@teste.com",
        cargo: "COLABORADOR",
        id_pdv: "pdv-2",
      }),
    });

    const resposta = await PATCH(request as never, { params: Promise.resolve({ id: "func-2" }) });
    const json = await resposta.json();

    expect(resposta.status).toBe(403);
    expect(json.erro).toBe("Sem permissao para editar este colaborador com os dados informados.");
  });
});
