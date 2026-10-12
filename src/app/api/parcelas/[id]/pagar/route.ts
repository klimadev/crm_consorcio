import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao, whereLeadsPorPerfil } from "@/lib/permissoes";
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

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
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
    include: {
      lead: {
        select: { id: true },
      },
    },
  });

  if (!parcela) {
    return notFound("Parcela não encontrada.");
  }

  const wherePermitido = await whereLeadsPorPerfil(auth.sessao);
  const leadPermitido = await prisma.lead.findFirst({
    where: { id: parcela.lead.id, ...wherePermitido },
    select: { id: true },
  });

  if (!leadPermitido) {
    return notFound("Parcela não encontrada.");
  }

  if (parcela.status === "PAGA" || parcela.data_pagamento) {
    return badRequest("Parcela já está paga.");
  }

  if (parcela.status === "CANCELADA" || parcela.status === "ABORTADA") {
    return badRequest("Parcela cancelada ou encerrada não pode ser paga.");
  }

  const dataPagamento = new Date(validacao.data.data_pagamento);
  const atualizada = await prisma.parcela.update({
    where: { id: parcela.id },
    data: {
      status: "PAGA",
      data_pagamento: dataPagamento,
    },
  });

  return NextResponse.json({ parcela: atualizada });
}
