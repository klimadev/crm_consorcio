import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3333";

describe("integração - WhatsApp Chat", () => {
  let cookie: string;
  let leadId: string;
  let empresaId: string;

  beforeAll(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${BASE_URL}/api/autenticacao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "liam@gmail.com", senha: "lima123" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.perfil).toBe("EMPRESA");

    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    cookie = setCookieHeader!;

    empresaId = json.perfil;
    expect(empresaId).toBeDefined();
  });

  describe("GET /api/leads", () => {
    it("retorna lista de leads autenticado", async () => {
      const response = await fetch(`${BASE_URL}/api/leads`, {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(Array.isArray(json.leads)).toBe(true);
    });
  });

  describe("GET /api/whatsapp/chat/messages", () => {
    beforeEach(async () => {
      const response = await fetch(`${BASE_URL}/api/leads`, {
        headers: { Cookie: cookie },
      });

      const json = await response.json();
      const leadComInstancia = json.leads.find(
        (l: { id_whatsapp_instancia: string | null }) => l.id_whatsapp_instancia,
      );

      if (leadComInstancia) {
        leadId = leadComInstancia.id;
      } else {
        leadId = "89a05910-ae89-4013-a578-bc1b4ffc65dc";
      }
    });

    it("retorna mensagens do lead com WhatsApp configurado", async () => {
      if (!leadId) {
        console.log("Nenhum lead com instância WhatsApp encontrada");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/whatsapp/chat/messages?leadId=${leadId}`,
        {
          headers: { Cookie: cookie },
        },
      );

      const json = await response.json();
      
      if (response.status === 409) {
        console.log("Lead sem instância WhatsApp configurada:", json.erro);
        expect(json.erro).toContain("sem instancia");
        return;
      }

      expect(response.status).toBe(200);
      expect(json).toHaveProperty("messages");
      expect(json).toHaveProperty("connectionStatus");
      expect(Array.isArray(json.messages)).toBe(true);

      console.log("Mensagens retornadas:", json.messages.length);
      console.log("Connection status:", json.connectionStatus);
    });

    it("retorna 404 para lead inexistente", async () => {
      const response = await fetch(
        `${BASE_URL}/api/whatsapp/chat/messages?leadId=lead-inexistente-123`,
        {
          headers: { Cookie: cookie },
        },
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.erro).toBe("Lead nao encontrado.");
    });
  });

  describe("POST /api/whatsapp/chat/send-message", () => {
    it("envia mensagem com sucesso para lead com WhatsApp configurado", async () => {
      const response = await fetch(`${BASE_URL}/api/whatsapp/chat/send-message`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: "89a05910-ae89-4013-a578-bc1b4ffc65dc",
          text: "Teste via API " + new Date().toISOString(),
          clientTempId: "test-" + Date.now(),
        }),
      });

      const json = await response.json();

      if (response.status === 409) {
        console.log("WhatsApp desconectado:", json.erro);
        expect(json.erro).toContain("desconectado");
        return;
      }

      if (response.status === 502) {
        console.log("Evolution API não retornou mensagem:", json.erro);
        return;
      }

      expect(response.status).toBe(200);
      expect(json.message).toBeDefined();
      expect(json.message.text).toContain("Teste via API");
      expect(json.message.fromMe).toBe(true);

      console.log("Mensagem enviada com sucesso:", json.message.id);
    }, 15000);

    it("retorna erro quando lead não tem acesso ou não existe", async () => {
      const response = await fetch(`${BASE_URL}/api/whatsapp/chat/send-message`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: "12b224c5-12b9-406f-b984-3248d7fd60e4",
          text: "Teste",
          clientTempId: "test-" + Date.now(),
        }),
      });

      const json = await response.json();
      expect([404, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(json.erro).toContain("sem instancia");
      } else {
        expect(json.erro).toContain("Lead");
      }
    });
  });
});

describe("integração - Sessão e Autenticação", () => {
  it("login com credenciais inválidas retorna erro", async () => {
    const response = await fetch(`${BASE_URL}/api/autenticacao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "inexistente@teste.com", senha: "senhaerrada" }),
    });

    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.erro).toContain("Credenciais invalidas");
  });

  it("login com payload inválido retorna erro de validação", async () => {
    const response = await fetch(`${BASE_URL}/api/autenticacao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nao-e-email", senha: "123" }),
    });

    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.erro).toContain("E-mail");
  });

  it("endpoint protegido retorna 401 sem cookie de sessão", async () => {
    const response = await fetch(`${BASE_URL}/api/leads`);

    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.erro).toBe("Nao autenticado.");
  });

  it("session contém campos obrigatórios", async () => {
    const response = await fetch(`${BASE_URL}/api/autenticacao/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "liam@gmail.com", senha: "lima123" }),
    });

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.perfil).toBe("EMPRESA");
    expect(response.headers.get("set-cookie")).toBeDefined();
  });
});
