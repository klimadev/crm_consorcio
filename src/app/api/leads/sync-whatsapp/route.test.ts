import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/permissoes", () => ({
  exigirSessao: vi.fn(),
}));

vi.mock("@/lib/estagios-fixos", () => ({
  obterEstagioIndefinido: vi.fn(),
}));

vi.mock("@/lib/whatsapp-chat", () => ({
  buscarTodasMensagensDaInstancia: vi.fn(),
  extrairNomeDoLeadDoMapa: vi.fn(),
  extrairDadosAdDoMapa: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappInstancia: {
      findMany: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    funcionario: {
      findMany: vi.fn(),
    },
    pdv: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/leads/sync-whatsapp/route";
import { obterEstagioIndefinido } from "@/lib/estagios-fixos";
import { buscarTodasMensagensDaInstancia, extrairNomeDoLeadDoMapa, extrairDadosAdDoMapa } from "@/lib/whatsapp-chat";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

function criarMapaMensagens(contatos: Array<{ id: string; nome: string }>) {
  const mapa = new Map<string, { pushName: string | null; dadosAd: null; timestamp: number; remoteJidAlt: string }>();
  for (const contato of contatos) {
    mapa.set(contato.id, {
      pushName: contato.nome,
      dadosAd: null,
      timestamp: Date.now(),
      remoteJidAlt: contato.id,
    });
  }
  return mapa;
}

describe("POST /api/leads/sync-whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(exigirSessao).mockResolvedValue({
      erro: null,
      sessao: {
        id_usuario: "user-1",
        id_empresa: "emp-1",
        perfil: "EMPRESA",
        id_pdv: null,
      },
    });

    vi.mocked(obterEstagioIndefinido).mockResolvedValue({ id: "estagio-indefinido" } as never);
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-criado" } as never);
    vi.mocked(prisma.pdv.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.pdv.update).mockResolvedValue({} as never);
    vi.mocked(extrairNomeDoLeadDoMapa).mockReturnValue(null as never);
    vi.mocked(extrairDadosAdDoMapa).mockReturnValue(null as never);
  });

  it("distribui leads em round-robin persistente (50/50)", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-1",
        nome: "WhatsApp Centro",
        instance_name: "wa-centro",
        pdvs: [{ id: "pdv-1", nome: "Centro" }],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([
      { id: "colab-1", id_pdv: "pdv-1", nome: "Ana" },
      { id: "colab-2", id_pdv: "pdv-1", nome: "Bruno" },
    ] as never);

    // round_robin_indice inicial = 5 (de um sync anterior)
    vi.mocked(prisma.pdv.findMany).mockResolvedValue([
      { id: "pdv-1", round_robin_indice: 5 },
    ] as never);

    const contatos = [
      { id: "5511999990001@s.whatsapp.net", nome: "Lead 1" },
      { id: "5511999990002@s.whatsapp.net", nome: "Lead 2" },
      { id: "5511999990003@s.whatsapp.net", nome: "Lead 3" },
      { id: "5511999990004@s.whatsapp.net", nome: "Lead 4" },
    ];
    vi.mocked(buscarTodasMensagensDaInstancia).mockResolvedValue(criarMapaMensagens(contatos) as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.criados).toBe(4);
    expect(prisma.lead.create).toHaveBeenCalledTimes(4);

    // índice 5 % 2 = 1 → Bruno; 6 % 2 = 0 → Ana; 7 % 2 = 1 → Bruno; 8 % 2 = 0 → Ana
    const funcionariosAtribuidos = vi.mocked(prisma.lead.create).mock.calls.map(([args]) => args.data.id_funcionario);
    expect(funcionariosAtribuidos).toEqual([
      "colab-2",
      "colab-1",
      "colab-2",
      "colab-1",
    ]);

    // Salva índice a cada lead: 6, 7, 8, 9 — última chamada com índice 9
    expect(prisma.pdv.update).toHaveBeenCalledTimes(4);
    expect(prisma.pdv.update).toHaveBeenLastCalledWith({
      where: { id: "pdv-1" },
      data: { round_robin_indice: 9 },
    });
  });

  it("distribui alternando igualmente com carga inicial zerada", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-1",
        nome: "WhatsApp Centro",
        instance_name: "wa-centro",
        pdvs: [{ id: "pdv-1", nome: "Centro" }],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([
      { id: "colab-1", id_pdv: "pdv-1", nome: "Ana" },
      { id: "colab-2", id_pdv: "pdv-1", nome: "Bruno" },
    ] as never);

    // round_robin_indice = 0 (primeiro sync)
    vi.mocked(prisma.pdv.findMany).mockResolvedValue([
      { id: "pdv-1", round_robin_indice: 0 },
    ] as never);

    const contatos = [
      { id: "5511999990001@s.whatsapp.net", nome: "Lead 1" },
      { id: "5511999990002@s.whatsapp.net", nome: "Lead 2" },
      { id: "5511999990003@s.whatsapp.net", nome: "Lead 3" },
    ];
    vi.mocked(buscarTodasMensagensDaInstancia).mockResolvedValue(criarMapaMensagens(contatos) as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.criados).toBe(3);

    // índice 0 → Ana, 1 → Bruno, 2 → Ana (50/50 independente de carga)
    const funcionariosAtribuidos = vi.mocked(prisma.lead.create).mock.calls.map(([args]) => args.data.id_funcionario);
    expect(funcionariosAtribuidos).toEqual([
      "colab-1",
      "colab-2",
      "colab-1",
    ]);

    expect(prisma.pdv.update).toHaveBeenCalledTimes(3);
    expect(prisma.pdv.update).toHaveBeenLastCalledWith({
      where: { id: "pdv-1" },
      data: { round_robin_indice: 3 },
    });
  });

  it("ignora instancia sem PDV configurado e retorna aviso", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-sem-pdv",
        nome: "WhatsApp Solto",
        instance_name: "wa-solto",
        pdvs: [],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([] as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.criados).toBe(0);
    expect(json.instancias_ignoradas).toEqual([
      {
        id: "inst-sem-pdv",
        nome: "WhatsApp Solto",
        motivo: "Instancia sem PDV configurado.",
      },
    ]);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it("ignora instancia cujo PDV nao tem colaboradores ativos", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-2",
        nome: "WhatsApp Zona Sul",
        instance_name: "wa-zona-sul",
        pdvs: [{ id: "pdv-2", nome: "Zona Sul" }],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([] as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.criados).toBe(0);
    expect(json.instancias_ignoradas).toEqual([
      {
        id: "inst-2",
        nome: "WhatsApp Zona Sul",
        motivo: "PDV 'Zona Sul' sem colaboradores ativos para receber leads.",
      },
    ]);
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it("ignora contatos duplicados existentes e repetidos no mesmo lote", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-dup",
        nome: "WhatsApp Duplicados",
        instance_name: "wa-duplicados",
        pdvs: [{ id: "pdv-dup", nome: "PDV Duplicados" }],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([
      { id: "colab-dup-1", id_pdv: "pdv-dup", nome: "Carlos" },
      { id: "colab-dup-2", id_pdv: "pdv-dup", nome: "Dora" },
    ] as never);

    vi.mocked(prisma.lead.findMany).mockResolvedValue([{ telefone: "5511999990001" }] as never);

    vi.mocked(prisma.pdv.findMany).mockResolvedValue([
      { id: "pdv-dup", round_robin_indice: 3 },
    ] as never);

    const contatos = [
      { id: "5511999990001@s.whatsapp.net", nome: "Ja Existente" },
      { id: "5511999990002@s.whatsapp.net", nome: "Novo 1" },
      { id: "5511999990002@s.whatsapp.net", nome: "Novo 1 Repetido" },
      { id: "5511999990003@s.whatsapp.net", nome: "Novo 2" },
    ];
    vi.mocked(buscarTodasMensagensDaInstancia).mockResolvedValue(criarMapaMensagens(contatos) as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.processados).toBe(3);
    expect(json.criados).toBe(2);
    expect(json.ignorados).toBe(1);
    expect(prisma.lead.create).toHaveBeenCalledTimes(2);

    // índice 3 % 2 = 1 → Dora, índice 4 % 2 = 0 → Carlos
    const funcionariosAtribuidos = vi.mocked(prisma.lead.create).mock.calls.map(([args]) => args.data.id_funcionario);
    expect(funcionariosAtribuidos).toEqual([
      "colab-dup-2",
      "colab-dup-1",
    ]);
  });

  it("mantem round-robin independente por PDV em multiplas instancias", async () => {
    vi.mocked(prisma.whatsappInstancia.findMany).mockResolvedValue([
      {
        id: "inst-a",
        nome: "WhatsApp A",
        instance_name: "wa-a",
        pdvs: [{ id: "pdv-a", nome: "PDV A" }],
      },
      {
        id: "inst-b",
        nome: "WhatsApp B",
        instance_name: "wa-b",
        pdvs: [{ id: "pdv-b", nome: "PDV B" }],
      },
    ] as never);

    vi.mocked(prisma.funcionario.findMany).mockResolvedValue([
      { id: "colab-a1", id_pdv: "pdv-a", nome: "Alice" },
      { id: "colab-a2", id_pdv: "pdv-a", nome: "Bianca" },
      { id: "colab-b1", id_pdv: "pdv-b", nome: "Caio" },
      { id: "colab-b2", id_pdv: "pdv-b", nome: "Diego" },
    ] as never);

    // PDV A: índice 7, PDV B: índice 2
    vi.mocked(prisma.pdv.findMany).mockResolvedValue([
      { id: "pdv-a", round_robin_indice: 7 },
      { id: "pdv-b", round_robin_indice: 2 },
    ] as never);

    vi.mocked(buscarTodasMensagensDaInstancia)
      .mockResolvedValueOnce(criarMapaMensagens([
        { id: "5511888880001@s.whatsapp.net", nome: "Lead A1" },
        { id: "5511888880002@s.whatsapp.net", nome: "Lead A2" },
      ]) as never)
      .mockResolvedValueOnce(criarMapaMensagens([
        { id: "5511777770001@s.whatsapp.net", nome: "Lead B1" },
        { id: "5511777770002@s.whatsapp.net", nome: "Lead B2" },
      ]) as never);

    const resposta = await POST(new Request("http://localhost/api/leads/sync-whatsapp", { method: "POST" }) as never);
    const json = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(json.criados).toBe(4);

    // PDV A (índice 7): 7%2=1 → Bianca, 8%2=0 → Alice
    // PDV B (índice 2): 2%2=0 → Caio, 3%2=1 → Diego
    expect(vi.mocked(prisma.lead.create).mock.calls.map(([args]) => ({
      telefone: args.data.telefone,
      id_funcionario: args.data.id_funcionario,
    }))).toEqual([
      { telefone: "5511888880001", id_funcionario: "colab-a2" },
      { telefone: "5511888880002", id_funcionario: "colab-a1" },
      { telefone: "5511777770001", id_funcionario: "colab-b1" },
      { telefone: "5511777770002", id_funcionario: "colab-b2" },
    ]);

    // Verifica que cada PDV foi atualizado com índices progressivos
    // PDV A: salva 8 e 9; PDV B: salva 3 e 4
    expect(prisma.pdv.update).toHaveBeenCalledTimes(4);
    const calls = vi.mocked(prisma.pdv.update).mock.calls.map(([args]) => ({
      where: (args as { where: { id: string } }).where.id,
      indice: (args as { data: { round_robin_indice: number } }).data.round_robin_indice,
    }));
    // Última chamada por PDV
    expect(calls.filter((c) => c.where === "pdv-a").at(-1)?.indice).toBe(9);
    expect(calls.filter((c) => c.where === "pdv-b").at(-1)?.indice).toBe(4);
  });
});
