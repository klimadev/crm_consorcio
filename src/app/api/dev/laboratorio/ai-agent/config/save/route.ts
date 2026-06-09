import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;
  const sessao = auth.sessao;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload JSON invalido." }, { status: 400 });
  }

  const { base_url, api_key, model, enabled } = body as {
    base_url?: string;
    api_key?: string;
    model?: string;
    enabled?: boolean;
  };

  if (!base_url || !model) {
    return NextResponse.json(
      { erro: "base_url e model sao obrigatorios." },
      { status: 400 },
    );
  }

  // If api_key is masked, fetch existing to preserve it
  let apiKeyToSave = api_key;
  if (api_key && api_key.startsWith("••••")) {
    const existing = await prisma.laboratorioAiConfig.findUnique({
      where: { id_empresa: sessao.id_empresa },
      select: { api_key: true },
    });
    apiKeyToSave = existing?.api_key ?? api_key;
  }

  await prisma.laboratorioAiConfig.upsert({
    where: { id_empresa: sessao.id_empresa },
    create: {
      id_empresa: sessao.id_empresa,
      base_url,
      api_key: apiKeyToSave,
      model,
      enabled: enabled ?? false,
    },
    update: {
      base_url,
      api_key: apiKeyToSave,
      model,
      enabled: enabled ?? false,
    },
  });

  return NextResponse.json({ sucesso: true });
}
