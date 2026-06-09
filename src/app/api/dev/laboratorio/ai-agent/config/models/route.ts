import { NextRequest, NextResponse } from "next/server";
import { listProviderModels } from "@/modules/laboratorio/ai-agent/lib/ai-client";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const { base_url, api_key } = body as {
    base_url?: string;
    api_key?: string;
  };

  if (!base_url || !api_key) {
    return NextResponse.json(
      { erro: "base_url e api_key sao obrigatorios." },
      { status: 400 },
    );
  }

  const models = await listProviderModels(base_url, api_key);

  return NextResponse.json({
    models,
    message: models.length === 0
      ? "Nao foi possivel listar modelos — use o campo manual."
      : undefined,
  });
}
