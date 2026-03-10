import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { criarInstancia } from "@/lib/evolution-api";
import { esquemaCriarWhatsappInstancia } from "@/lib/validacoes";
import { handleRouteError } from "@/lib/api/route-errors";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { withRetry } from "@/lib/api/retry";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const instanciasDb = await prisma.whatsappInstancia.findMany({
    where: { id_empresa: auth.sessao.id_empresa },
    orderBy: { criado_em: "desc" },
  });

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

  const instancias = await Promise.all(
    instanciasDb.map(async (inst) => {
      const instanciaApi = instanciasApi.find(
        (i) => i.name === inst.instance_name
      );

      if (instanciaApi) {
        const estado = (instanciaApi.connectionStatus as string) ?? "unknown";
        const phone = (instanciaApi.ownerJid as string)?.replace("@s.whatsapp.net", "") ?? null;
        const profileName = (instanciaApi.profileName as string) ?? null;
        const profilePic = (instanciaApi.profilePicUrl as string) ?? null;

        try {
          await withRetry(
            () =>
              prisma.whatsappInstancia.update({
                where: { id: inst.id },
                data: {
                  status: estado,
                  phone: phone,
                  profile_name: profileName,
                  profile_pic: profilePic,
                },
              }),
            { maxAttempts: 3, delayMs: 1000 }
          );
        } catch (erro) {
          console.error("Erro ao atualizar instância no DB:", erro);
        }

        return {
          ...inst,
          status: estado,
          phone: phone,
          profile_name: profileName,
          profile_pic: profilePic,
        };
      }

      return { ...inst, status: "disconnected" };
    })
  );

  return NextResponse.json({ instancias });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(esquemaCriarWhatsappInstancia, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }
  const nome = validacao.data.nome;

  const instanceName = `crm_${auth.sessao.id_usuario.slice(0, 8)}_${Date.now()}`;

  try {
    const resultado = await criarInstancia({ nome: instanceName });

    const instancia = await prisma.whatsappInstancia.create({
      data: {
        id_empresa: auth.sessao.id_empresa,
        id_criador: auth.sessao.id_usuario,
        nome,
        instance_name: resultado.instanceName,
        status: "pending",
      },
    });

    return NextResponse.json({ 
      instancia,
      qrCode: resultado.base64,
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message) {
      return NextResponse.json({ erro: erro.message }, { status: 500 });
    }
    return handleRouteError(erro, "Erro ao criar instância.", "Erro ao criar instância WhatsApp:");
  }
}
