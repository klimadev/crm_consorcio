import { prisma } from "@/lib/prisma";

interface AiProviderOpts {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export async function callAiText(
  opts: AiProviderOpts,
  systemPrompt: string,
  userPrompt: string,
  options?: { reasoningEffort?: string },
): Promise<string> {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
  };

  if (options?.reasoningEffort) {
    body.reasoning_effort = options.reasoningEffort;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `AI provider error (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const raw = await response.text();

  // Try to parse as normal JSON first
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string | null; reasoning_content?: string | null };
      }>;
    };

    const choice = parsed.choices?.[0];
    const text = choice?.message?.content || choice?.message?.reasoning_content;
    if (typeof text === "string" && text.length > 0) {
      if (choice?.finish_reason === "length") {
        console.warn("AI response may be truncated (finish_reason: length)");
      }
      return text;
    }
  } catch {
    // Not pure JSON, might be SSE
  }

  // Try to extract SSE response (data: {...})
  const lines = raw.split("\n");
  let fullContent = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:") && !trimmed.includes("[DONE]")) {
      try {
        const parsed = JSON.parse(trimmed.slice(5)) as {
          choices?: Array<{
            finish_reason?: string;
            delta?: { content?: string | null; reasoning_content?: string | null };
            message?: { content?: string | null; reasoning_content?: string | null };
          }>;
        };

        const choice = parsed.choices?.[0];
        const delta =
          choice?.delta?.content ||
          choice?.delta?.reasoning_content ||
          choice?.message?.content ||
          choice?.message?.reasoning_content ||
          "";
        if (delta) fullContent += delta;
      } catch {
        // ignore malformed lines
      }
    }
  }

  if (fullContent) return fullContent;

  throw new Error(
    `AI response does not contain expected text content. Raw: ${raw.slice(0, 500)}`,
  );
}

export async function getAiConfig(idEmpresa: string): Promise<{
  baseUrl: string;
  apiKey: string;
  model: string;
  configured: boolean;
}> {
  const config = await prisma.laboratorioAiConfig.findUnique({
    where: { id_empresa: idEmpresa },
  });

  if (config?.enabled && config.api_key) {
    return {
      baseUrl: config.base_url,
      apiKey: config.api_key,
      model: config.model,
      configured: true,
    };
  }

  return {
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4o",
    configured: false,
  };
}

export async function listProviderModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/models`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return [];
    const json = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return json.data?.map((m) => m.id) || [];
  } catch {
    return [];
  }
}

export async function testProviderConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<boolean> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Responda apenas: OK" }],
        max_tokens: 5,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
