import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { criarInstancia, gerarQrCode } from "@/lib/evolution-api";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const instanciasDb = await prisma.whatsappInstancia.findMany({
    where: { id_criador: auth.sessao.id_usuario },
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
          await prisma.whatsappInstancia.update({
            where: { id: inst.id },
            data: {
              status: estado,
              phone: phone,
              profile_name: profileName,
              profile_pic: profilePic,
            },
          });
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

  const body = (await request.json()) as { nome?: string };
  const nome = body.nome?.trim();

  if (!nome) {
    return NextResponse.json({ erro: "Nome da instância é obrigatório." }, { status: 400 });
  }

  if (nome.length < 3) {
    return NextResponse.json({ erro: "Nome precisa ter pelo menos 3 caracteres." }, { status: 400 });
  }

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
    console.error("Erro ao criar instância WhatsApp:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro ao criar instância." },
      { status: 500 }
    );
  }
}
