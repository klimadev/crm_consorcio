import { NextRequest, NextResponse } from "next/server";
import { ensureSqliteOptimizations, prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

export async function GET(request: NextRequest) {
  await ensureSqliteOptimizations();

  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  // Buscar instâncias do banco
  const instanciasDb = await prisma.whatsappInstancia.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    select: {
      id: true,
      instance_name: true,
      status: true,
    },
  });

  // Buscar status da API externa
  let instanciasApi: Record<string, unknown>[] = [];
  try {
    const resApi = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
    });
    if (resApi.ok) {
      const json = await resApi.json();
      instanciasApi = json as Record<string, unknown>[];
    }
  } catch (erro) {
    console.error("Erro ao buscar instâncias da API:", erro);
  }

  // Contar instâncias ativas (status "open" ou "connected")
  let ativas = 0;
  const instancias = instanciasDb.map((inst) => {
    const instanciaApi = instanciasApi.find(
      (i) => i.name === inst.instance_name
    );

    let statusFinal = inst.status;
    if (instanciaApi) {
      const estado = (instanciaApi.connectionStatus as string) ?? "unknown";
      statusFinal = estado;
    }

    // Considerar ativa se o status for "open" ou "connected"
    const isAtiva = statusFinal === "open" || statusFinal === "connected";
    if (isAtiva) {
      ativas += 1;
    }

    return {
      ...inst,
      status: statusFinal,
    };
  });

  return NextResponse.json({
    total: instancias.length,
    ativas,
    instancias,
  });
}
