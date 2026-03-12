import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { reconectarInstanciaWhatsapp, sincronizarEstadoWhatsapp } from "@/lib/whatsapp-instance-state";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;

  let instancia;
  if (auth.sessao.perfil === "GERENTE") {
    instancia = await prisma.whatsappInstancia.findFirst({
      where: { id, id_empresa: auth.sessao.id_empresa },
    });
  } else {
    instancia = await prisma.whatsappInstancia.findFirst({
      where: { id, id_criador: auth.sessao.id_usuario },
    });
  }

  if (!instancia) {
    return NextResponse.json({ erro: "Instância não encontrada." }, { status: 404 });
  }

  try {
    const estadoAtual = await sincronizarEstadoWhatsapp(instancia);

    if (estadoAtual.conectado) {
      return NextResponse.json({ qrCode: null, status: estadoAtual.status, phone: estadoAtual.phone });
    }

    const resultado = await reconectarInstanciaWhatsapp(instancia, { forcarQrCode: true });

    return NextResponse.json({
      qrCode: resultado.qrCode,
      pairingCode: resultado.pairingCode,
      status: resultado.status,
      phone: resultado.phone,
      conectado: resultado.conectado,
      origem: resultado.origem,
    });
  } catch (erro) {
    console.error("Erro ao buscar QR Code:", erro);
    return NextResponse.json({ qrCode: null, status: "error" });
  }
}
