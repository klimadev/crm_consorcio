import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn<() => Promise<unknown>>(),
  respostaSemPermissao: vi.fn<() => Response>(() => new Response(JSON.stringify({ erro: "Sem permissão." }), { status: 403 })),
  whereLeadsPorPerfil: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parcela: {
      findFirst: vi.fn<() => Promise<unknown>>(),
      update: vi.fn<() => Promise<unknown>>(),
    },
    lead: {
      findFirst: vi.fn<() => Promise<unknown>>(),
    },
  },
}));

import { PATCH as patchParcela } from "@/app/api/parcelas/[id]/route";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

function criarRequisicao(body: unknown, id = "parcela-1") {
  return new Request(`http://localhost/api/parcelas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const parcelaAberta = {
  id: "parcela-1",
  id_empresa: "emp-1",
  id_lead: "lead-1",
  numero_parcela: 2,
  quantidade_total: 5,
  valor: 500,
  status: "AGUARDANDO",
  data_pagamento: null,
  observacao_cobranca: null,
  lead: { id: "lead-1" },
};

describe("PATCH /api/parcelas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: { id_usuario: "admin-1", id_empresa: "emp-1", perfil: "EMPRESA", id_pdv: null },
    } as never);

    vi.mocked(whereLeadsPorPerfil).mockResolvedValue({} as never);
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: "lead-1" } as never);
  });

  it("salva a observação de cobrança sem alterar os demais campos", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({ ...parcelaAberta } as never);
    vi.mocked(prisma.parcela.update).mockResolvedValue({
      ...parcelaAberta,
      observacao_cobranca: "cliente pediu prazo até sexta",
    } as never);

    const resposta = await patchParcela(
      criarRequisicao({ observacao_cobranca: "cliente pediu prazo até sexta" }) as never,
      params("parcela-1"),
    );
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(prisma.parcela.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "parcela-1" },
        data: expect.objectContaining({
          observacao_cobranca: "cliente pediu prazo até sexta",
          status: "AGUARDANDO",
          data_pagamento: null,
        }),
      }),
    );
    expect(json.parcela.observacao_cobranca).toBe("cliente pediu prazo até sexta");
  });

  it("limpa a observação quando o payload envia null", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({
      ...parcelaAberta,
      observacao_cobranca: "nota antiga",
    } as never);
    vi.mocked(prisma.parcela.update).mockResolvedValue({ ...parcelaAberta } as never);

    const resposta = await patchParcela(criarRequisicao({ observacao_cobranca: null }) as never, params("parcela-1"));

    expect(resposta.status).toBe(200);
    expect(prisma.parcela.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ observacao_cobranca: null }),
      }),
    );
  });

  it("rejeita edição de parcela cancelada, inclusive da observação", async () => {
    vi.mocked(prisma.parcela.findFirst).mockResolvedValue({ ...parcelaAberta, status: "CANCELADA" } as never);

    const resposta = await patchParcela(
      criarRequisicao({ observacao_cobranca: "qualquer coisa" }) as never,
      params("parcela-1"),
    );
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro).toBe("Parcela cancelada ou encerrada não pode ser editada. Reabra a parcela primeiro.");
  });

  it("rejeita observação acima de 500 caracteres (validação Zod)", async () => {
    const resposta = await patchParcela(criarRequisicao({ observacao_cobranca: "a".repeat(501) }) as never, params("parcela-1"));

    expect(resposta.status).toBe(400);
  });

  it("rejeita COLABORADOR", async () => {
    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: { id_usuario: "col-1", id_empresa: "emp-1", perfil: "COLABORADOR", id_pdv: "pdv-1" },
    } as never);

    const resposta = await patchParcela(criarRequisicao({ observacao_cobranca: "x" }) as never, params("parcela-1"));

    expect(resposta.status).toBe(403);
  });
});
