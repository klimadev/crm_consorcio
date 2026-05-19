import { NextRequest, NextResponse } from "next/server";
import { ensureSqliteOptimizations, prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { verificarErrosConsecutivosEnvio } from "@/lib/whatsapp-chat";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

const STATUS_ATIVOS = new Set(["open", "connected"]);

export async function GET(request: NextRequest) {
  await ensureSqliteOptimizations();

  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  // Buscar instancias do banco
  const instanciasDb = await prisma.whatsappInstancia.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    select: {
      id: true,
      instance_name: true,
      status: true,
    },
  });

  // Buscar status da API externa para enriquecer com dados ao vivo
  const instanciasApiMap = new Map<string, Record<string, unknown>>();
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
      const lista = (json.instances ?? json ?? []) as Record<string, unknown>[];
      for (const item of lista) {
        const nome = item.name as string | undefined;
        if (nome) instanciasApiMap.set(nome, item);
      }
    }
  } catch (erro) {
    console.error("Erro ao buscar instancias da API:", erro);
  }

  // Contar instancias ativas considerando multiplos sinais
  let ativas = 0;
  const instancias: Array<Record<string, unknown>> = [];

  for (const inst of instanciasDb) {
    const instanciaApi = instanciasApiMap.get(inst.instance_name);

    // Prioriza status do DB (ja validado pelo sincronizarEstadoWhatsapp),
    // fallback para API
    let statusFinal = inst.status;
    if (instanciaApi) {
      const connectionStatus = String(instanciaApi.connectionStatus ?? "");
      // Se o DB tem status desatualizado, usa o da API como override inicial
      if (connectionStatus && inst.status !== "degraded") {
        statusFinal = connectionStatus;
      } else if (!connectionStatus) {
        statusFinal = inst.status || "unknown";
      }
    }

    // Verifica sinais de degradacao da API
    const apiOpen = statusFinal === "open" || statusFinal === "connected";
    if (apiOpen) {
      const disconnectionReasonCode = instanciaApi?.disconnectionReasonCode ?? null;
      if (disconnectionReasonCode !== null && disconnectionReasonCode !== undefined) {
        statusFinal = "degraded";
      }
    }

    // Verifica erros consecutivos recentes no banco
    if (statusFinal === "open" || statusFinal === "connected") {
      const temErrosConsecutivos = await verificarErrosConsecutivosEnvio(inst.id);
      if (temErrosConsecutivos) {
        statusFinal = "degraded";
      }
    }

    if (STATUS_ATIVOS.has(statusFinal)) {
      ativas += 1;
    }

    instancias.push({
      id: inst.id,
      instance_name: inst.instance_name,
      status: statusFinal,
    });
  }

  return NextResponse.json({
    total: instancias.length,
    ativas,
    instancias,
  });
}
