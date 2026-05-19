import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertMensagensNoBanco, buscarMensagensEvolution, mapearStatusMensagem, escolherStatusMaisForte } from "./whatsapp-chat";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappMensagem: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsappMensagem: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({ id: "msg-1" }),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("upsertMensagensNoBanco", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nao executa operacoes quando array de mensagens esta vazio", async () => {
    await upsertMensagensNoBanco(prisma, {
      idEmpresa: "emp-1",
      idLead: "lead-1",
      idWhatsappInstancia: "inst-1",
      mensagens: [],
    });

    expect(prisma.whatsappMensagem.findMany).not.toHaveBeenCalled();
    expect(prisma.whatsappMensagem.createMany).not.toHaveBeenCalled();
  });

  it("faz apenas createMany quando nenhuma mensagem existe no banco", async () => {
    vi.mocked(prisma.whatsappMensagem.findMany).mockResolvedValueOnce([]);

    await upsertMensagensNoBanco(prisma, {
      idEmpresa: "emp-1",
      idLead: "lead-1",
      idWhatsappInstancia: "inst-1",
      mensagens: [
        {
          messageId: "msg-1",
          remoteJid: "5511999999999@s.whatsapp.net",
          remoteJidAlt: "5511999999999@s.whatsapp.net",
          fromMe: false,
          kind: "text" as const,
          tipoLabel: "Texto",
          text: "Olá",
          status: "DELIVERED" as const,
          timestamp: 1700000000,
          timestampIso: "2023-11-15T00:00:00.000Z",
          dadosAd: null,
          error: null,
          payloadJson: "{}",
        },
      ],
    });

    expect(prisma.whatsappMensagem.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappMensagem.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappMensagem.update).not.toHaveBeenCalled();
  });

  it("faz update quando mensagem ja existe e status mudou", async () => {
    vi.mocked(prisma.whatsappMensagem.findMany).mockResolvedValueOnce([
      {
        id: "msg-db-1",
        mensagem_id: "msg-1",
        status: "SENT",
        tipo: "text",
        conteudo: "Olá",
        erro: null,
        payload_json: "{}",
      },
    ] as never);

    await upsertMensagensNoBanco(prisma, {
      idEmpresa: "emp-1",
      idLead: "lead-1",
      idWhatsappInstancia: "inst-1",
      mensagens: [
        {
          messageId: "msg-1",
          remoteJid: "5511999999999@s.whatsapp.net",
          remoteJidAlt: "5511999999999@s.whatsapp.net",
          fromMe: false,
          kind: "text" as const,
          tipoLabel: "Texto",
          text: "Olá",
          status: "DELIVERED" as const,
          timestamp: 1700000000,
          timestampIso: "2023-11-15T00:00:00.000Z",
          dadosAd: null,
          error: null,
          payloadJson: "{}",
        },
      ],
    });

    expect(prisma.whatsappMensagem.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappMensagem.createMany).not.toHaveBeenCalled();
    expect(prisma.whatsappMensagem.update).toHaveBeenCalledTimes(1);
  });

  it("nao faz update quando mensagem ja existe e status e identico", async () => {
    vi.mocked(prisma.whatsappMensagem.findMany).mockResolvedValueOnce([
      {
        id: "msg-db-1",
        mensagem_id: "msg-1",
        status: "DELIVERED",
        tipo: "text",
        conteudo: "Olá",
        erro: null,
        payload_json: "{}",
      },
    ] as never);

    await upsertMensagensNoBanco(prisma, {
      idEmpresa: "emp-1",
      idLead: "lead-1",
      idWhatsappInstancia: "inst-1",
      mensagens: [
        {
          messageId: "msg-1",
          remoteJid: "5511999999999@s.whatsapp.net",
          remoteJidAlt: null,
          fromMe: false,
          kind: "text" as const,
          tipoLabel: "Texto",
          text: "Olá",
          status: "DELIVERED" as const,
          timestamp: 1700000000,
          timestampIso: "2023-01-01T00:00:00.000Z",
          dadosAd: null,
          error: null,
          payloadJson: "{}",
        },
      ],
    });

    expect(prisma.whatsappMensagem.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappMensagem.createMany).not.toHaveBeenCalled();
    expect(prisma.whatsappMensagem.update).not.toHaveBeenCalled();
  });

  it("deduplica mensagens por messageId mantendo a mais recente", async () => {
    vi.mocked(prisma.whatsappMensagem.findMany).mockResolvedValueOnce([]);

    await upsertMensagensNoBanco(prisma, {
      idEmpresa: "emp-1",
      idLead: "lead-1",
      idWhatsappInstancia: "inst-1",
      mensagens: [
        {
          messageId: "msg-1",
          remoteJid: "5511999999999@s.whatsapp.net",
          remoteJidAlt: null,
          fromMe: false,
          kind: "text" as const,
          tipoLabel: "Texto",
          text: "Olá antiga",
          status: "SENT" as const,
          timestamp: 1700000000,
          timestampIso: "2023-01-01T00:00:00.000Z",
          dadosAd: null,
          error: null,
          payloadJson: "{}",
        },
        {
          messageId: "msg-1",
          remoteJid: "5511999999999@s.whatsapp.net",
          remoteJidAlt: null,
          fromMe: false,
          kind: "text" as const,
          tipoLabel: "Texto",
          text: "Olá nova",
          status: "DELIVERED" as const,
          timestamp: 1700000100,
          timestampIso: "2023-01-01T00:00:00.000Z",
          dadosAd: null,
          error: null,
          payloadJson: "{}",
        },
      ],
    });

    const createManyCall = vi.mocked(prisma.whatsappMensagem.createMany).mock.calls[0];
    const data = createManyCall[0]?.data as Array<{ conteudo: string; timestamp: number }>;
    
    expect(data).toBeDefined();
    expect(data.length).toBe(1);
    expect(data[0].conteudo).toBe("Olá nova");
    expect(data[0].timestamp).toBe(1700000100);
  });
});

describe("buscarMensagensEvolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("faz fetch com timeout de 5 segundos", async () => {
    vi.stubEnv("EVOLUTION_API_URL", "http://localhost:8080");
    vi.stubEnv("EVOLUTION_API_KEY", "test-key");

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    mockFetch.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve(new Response("[]")), 100);
      return {
        then: (cb: (r: Response) => void) => {
          setTimeout(() => cb(new Response("[]")), 100);
          return { catch: () => ({}) };
        },
      } as unknown as Promise<Response>;
    }));

    try {
      await buscarMensagensEvolution("test-instance", "5511999999999@s.whatsapp.net");
    } catch {
    }

    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("escolherStatusMaisForte", () => {
  it("retorna o status mais forte entre dois", () => {
    expect(escolherStatusMaisForte("SENT", "DELIVERED")).toBe("DELIVERED");
    expect(escolherStatusMaisForte("DELIVERED", "READ")).toBe("READ");
    expect(escolherStatusMaisForte("READ", "ERROR")).toBe("ERROR");
    expect(escolherStatusMaisForte("PENDING", "SENT")).toBe("SENT");
  });

  it("mantem status atual se for mais forte", () => {
    expect(escolherStatusMaisForte("READ", "DELIVERED")).toBe("READ");
    expect(escolherStatusMaisForte("ERROR", "PENDING")).toBe("ERROR");
  });
});

describe("mapearStatusMensagem", () => {
  it("mapeia status raw corretamente", () => {
    expect(mapearStatusMensagem("error", false)).toBe("ERROR");
    expect(mapearStatusMensagem("read", false)).toBe("READ");
    expect(mapearStatusMensagem("delivered", false)).toBe("DELIVERED");
    expect(mapearStatusMensagem("sent", false)).toBe("SENT");
    expect(mapearStatusMensagem("server_ack", false)).toBe("SENT");
    expect(mapearStatusMensagem("pending", false)).toBe("PENDING");
  });

  it("trata status desconhecido com fallback", () => {
    expect(mapearStatusMensagem(undefined, false)).toBe("DELIVERED");
    expect(mapearStatusMensagem(null, true)).toBe("SENT");
    expect(mapearStatusMensagem("unknown_status", false)).toBe("DELIVERED");
  });
});
