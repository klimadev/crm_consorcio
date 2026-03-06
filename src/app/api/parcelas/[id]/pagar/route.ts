import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaPagarParcela } from "@/lib/validacoes";
import { badRequest, notFound } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaPagarParcela, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const parcela = await prisma.parcela.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (!parcela) {
    return notFound("Parcela nao encontrada.");
  }

  if (parcela.status === "PAGO") {
    return badRequest("Parcela ja esta paga.");
  }

  const dataPagamento = new Date(validacao.data.data_pagamento);
  const atualizada = await prisma.parcela.update({
    where: { id: parcela.id },
    data: {
      status: "PAGO",
      data_pagamento: dataPagamento,
    },
  });

  return NextResponse.json({ parcela: atualizada });
}
