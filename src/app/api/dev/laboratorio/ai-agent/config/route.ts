import { NextRequest, NextResponse } from "next/server";
import { exigirSessao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;
  const sessao = auth.sessao;

  const config = await prisma.laboratorioAiConfig.findUnique({
    where: { id_empresa: sessao.id_empresa },
  });

  return NextResponse.json({
    config: config
      ? {
          base_url: config.base_url,
          api_key: config.api_key ? "••••" + config.api_key.slice(-4) : null,
          model: config.model,
          enabled: config.enabled,
        }
      : null,
  });
}
