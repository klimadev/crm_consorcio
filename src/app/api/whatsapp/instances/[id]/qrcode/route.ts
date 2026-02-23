import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { gerarQrCode } from "@/lib/evolution-api";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  const instancia = await prisma.whatsappInstancia.findFirst({
    where: { id, id_criador: auth.sessao.id_usuario },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Instância não encontrada." }, { status: 404 });
  }

  try {
    const resposta = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${instancia.instance_name}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
      }
    );

    if (!resposta.ok) {
      return NextResponse.json({ qrCode: null, status: "disconnected" });
    }

    const json = await resposta.json();
    const data = json.instance ?? json;
    const status = data.state ?? "unknown";
    const phone = data.owner?.replace("@s.whatsapp.net", "") ?? null;

    await prisma.whatsappInstancia.update({
      where: { id: instancia.id },
      data: { status, phone },
    });

    if (phone) {
      return NextResponse.json({ qrCode: null, status, phone });
    }

    const qrData = await gerarQrCode(instancia.instance_name);
    
    return NextResponse.json({ 
      qrCode: qrData?.base64 ?? qrData?.code ?? null, 
      status,
      phone 
    });
  } catch (erro) {
    console.error("Erro ao buscar QR Code:", erro);
    return NextResponse.json({ qrCode: null, status: "error" });
  }
}
