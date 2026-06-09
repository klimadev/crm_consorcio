import { NextRequest, NextResponse } from "next/server";
import { testProviderConnection } from "@/modules/laboratorio/ai-agent/lib/ai-client";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const { base_url, api_key, model } = body as {
    base_url?: string;
    api_key?: string;
    model?: string;
  };

  if (!base_url || !api_key || !model) {
    return NextResponse.json(
      { erro: "base_url, api_key e model sao obrigatorios." },
      { status: 400 },
    );
  }

  const ok = await testProviderConnection(base_url, api_key, model);

  return NextResponse.json({
    success: ok,
    message: ok ? "Conexao bem-sucedida!" : "Falha na conexao. Verifique URL, chave e modelo.",
  });
}
