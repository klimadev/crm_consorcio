import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeVerEquipe, respostaSemPermissao } from "@/lib/permissoes";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { esquemaReconectarWhatsappInstancia } from "@/lib/validacoes";
import { notFound } from "@/lib/api/http";
import { reconectarInstanciaWhatsapp } from "@/lib/whatsapp-instance-state";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }
  if (!podeVerEquipe(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaReconectarWhatsappInstancia, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const instancia = await prisma.whatsappInstancia.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!instancia) {
    return notFound("Instância não encontrada ou acesso negado.");
  }

  try {
    const resultado = await reconectarInstanciaWhatsapp(instancia, {
      forcarQrCode: validacao.data.forcarQrCode,
    });

    const instanciaAtualizada = await prisma.whatsappInstancia.findUnique({
      where: { id: instancia.id },
    });

    return NextResponse.json({
      instancia: instanciaAtualizada,
      qrCode: resultado.qrCode,
      pairingCode: resultado.pairingCode,
      status: resultado.status,
      conectado: resultado.conectado,
      origem: resultado.origem,
    });
  } catch (erro) {
    console.error("Erro ao reconectar instância WhatsApp:", erro);
    return NextResponse.json({ erro: "Erro ao reconectar instância." }, { status: 500 });
  }
}
