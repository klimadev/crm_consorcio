import { describe, it, expect } from "vitest";
import { extractJson } from "../extract-json";

describe("extractJson", () => {
  it("extrai JSON puro", () => {
    const result = extractJson(`{"sentimento": "CALOR", "prioridade": "ALTA"}`);
    expect(result).toEqual({ sentimento: "CALOR", prioridade: "ALTA" });
  });

  it("extrai JSON dentro de bloco markdown ```json", () => {
    const result = extractJson(`\`\`\`json
{"sentimento": "MORNO", "prioridade": "MEDIA"}
\`\`\``);
    expect(result).toEqual({ sentimento: "MORNO", prioridade: "MEDIA" });
  });

  it("extrai JSON dentro de bloco markdown ``` sem lang", () => {
    const result = extractJson(`Aqui está a análise:

\`\`\`
{"sentimento": "FRIO", "prioridade": "FRIA"}
\`\`\`

Espero que ajude!`);
    expect(result).toEqual({ sentimento: "FRIO", prioridade: "FRIA" });
  });

  it("extrai JSON com texto ao redor", () => {
    const raw = `We asked to analyze...
After careful consideration, I'll output:
{"analysis":[{"leadName":"João","sentiment":"CALOR"}],"summary":{"totalLeads":1,"urgentes":0,"quentes":1,"frios":0}}
Hope this helps!`;
    const result = extractJson(raw);
    expect(result).toHaveProperty("analysis");
    expect((result as any).analysis[0].leadName).toBe("João");
    expect((result as any).summary.totalLeads).toBe(1);
  });

  it("extrai JSON com reasoning do modelo", () => {
    const raw = `{"id":"abc","object":"chat.completion","choices":[{"index":0,"finish_reason":"length","message":{"role":"assistant","content":"","reasoning_content":"Thinking..."}}]}`;
    const result = extractJson(raw);
    expect(result).toBeDefined();
  });

  it("lança erro se não tem JSON nenhum", () => {
    expect(() => extractJson("")).toThrow("Invalid JSON response");
    expect(() => extractJson("Não entendi")).toThrow("Invalid JSON response");
  });

  it("extrai array JSON", () => {
    const result = extractJson(`[{"id":1},{"id":2}]`);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("extrai JSON com \\n e espaços extras", () => {
    const result = extractJson(`

  {"a": 1, "b": 2}

`);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("lida com JSON aninhado complexo", () => {
    const complex = {
      analysis: [
        { leadName: "Maria", sentiment: "CALOR", messageCount: 15 },
        { leadName: "José", sentiment: "FRIO", messageCount: 3 },
      ],
      summary: { totalLeads: 2, urgentes: 1, quentes: 1, frios: 0 },
    };
    const result = extractJson(JSON.stringify(complex));
    expect(result).toEqual(complex);
  });
});
