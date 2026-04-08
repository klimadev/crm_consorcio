import { beforeEach, describe, expect, it, vi } from "vitest";

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
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    funcionario: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/leads/[id]/route";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

describe("GET /api/leads/[id]", () => {
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

    vi.mocked(whereLeadsPorPerfil).mockResolvedValue({
      id_empresa: "emp-1",
      id_funcionario: { in: ["func-1"] },
    });

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([] as never);
  });

  it("consulta o lead com o escopo do perfil logado", async () => {
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({
      id: "lead-1",
      nome: "Lead 1",
      telefone: "11999999999",
      origem: "MANUAL",
      anuncio_titulo: null,
      anuncio_descricao: null,
      observacoes: null,
      valor_consorcio: 1000,
      estagio: { id: "estagio-1", nome: "Novo" },
      funcionario: {
        id: "func-1",
        id_pdv: "pdv-1",
        pdv: { id: "pdv-1", nome: "PDV 1" },
      },
      parcelas: [],
    } as never);

    const resposta = await GET(new Request("http://localhost/api/leads/lead-1") as never, {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "lead-1",
          id_empresa: "emp-1",
          id_funcionario: { in: ["func-1"] },
        },
      }),
    );

    expect(resposta.status).toBe(200);
    const json = await resposta.json();
    expect(json.id).toBe("lead-1");
    expect(json.id_pdv).toBe("pdv-1");
  });
});
