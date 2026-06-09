import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";

interface AiProviderOpts {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Factory: cria uma instância de modelo OpenAI-compatível.
 * O @ai-sdk/openai aceita `baseURL` customizada, então funciona com
 * OpenAI direto, Azure, LiteLLM, vLLM, Ollama via proxy, etc.
 */
export function createAiProvider(opts: AiProviderOpts) {
  const provider = createOpenAI({
    baseURL: opts.baseUrl.replace(/\/$/, ""),
    apiKey: opts.apiKey,
  });
  return provider(opts.model);
}

/**
 * Busca a config do provider para uma empresa no banco.
 * Se não existir ou disabled, usa fallback para env vars globais.
 */
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

  // Fallback global
  return {
    baseUrl: process.env.OPENAI_API_KEY
      ? "https://api.openai.com/v1"
      : "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: "gpt-4o",
    configured: false,
  };
}

/**
 * Consulta o endpoint /models do provider para listar modelos disponíveis.
 * Não falha se não for compatível — retorna array vazio.
 */
export async function listProviderModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/models`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) return [];

    const json = (await response.json()) as { data?: Array<{ id: string }> };
    return json.data?.map((m) => m.id) ?? [];
  } catch {
    return [];
  }
}

/**
 * Testa a conexão com o provider fazendo uma chamada simples de chat.
 * Retorna true se conseguiu resposta, false caso contrário.
 */
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
