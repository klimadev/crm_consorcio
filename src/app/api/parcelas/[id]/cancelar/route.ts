import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaCancelarParcela } from "@/lib/validacoes";
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

  // Apenas EMPRESA ou GERENTE podem cancelar parcelas
  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaCancelarParcela, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const wherePermitido = await whereLeadsPorPerfil(auth.sessao);
  const parcela = await prisma.parcela.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa, lead: wherePermitido },
  });

  if (!parcela) {
    return notFound("Parcela nao encontrada.");
  }

  if (parcela.status === "PAGA" || parcela.data_pagamento) {
    return badRequest("Parcela paga nao pode ser cancelada.");
  }

  if (parcela.status === "CANCELADA") {
    return badRequest("Parcela ja esta cancelada.");
  }

  const dados = validacao.data;
  const canceladoEm = dados.data_cancelamento ? new Date(dados.data_cancelamento) : new Date();
  const dadosCancelamento = {
    motivo_cancelamento: dados.motivo ?? null,
    cancelado_em: canceladoEm,
    cancelado_por: auth.sessao.id_usuario,
  };

  if (dados.modo === "PONTUAL") {
    await prisma.parcela.update({
      where: { id: parcela.id },
      data: { status: "CANCELADA", ...dadosCancelamento },
    });

    return NextResponse.json({ ok: true, canceladas: 1, abortadas: 0 });
  }

  // Modo SUBSEQUENTES: cancela a parcela K e aborta as parcelas posteriores nao pagas do mesmo lead
  const abortadas = await prisma.$transaction(async (tx) => {
    await tx.parcela.update({
      where: { id: parcela.id },
      data: { status: "CANCELADA", ...dadosCancelamento },
    });

    const resultado = await tx.parcela.updateMany({
      where: {
        id_empresa: auth.sessao.id_empresa,
        id_lead: parcela.id_lead,
        numero_parcela: { gt: parcela.numero_parcela },
        status: { notIn: ["PAGA", "CANCELADA"] },
      },
      data: { status: "ABORTADA", ...dadosCancelamento },
    });

    return resultado.count;
  });

  return NextResponse.json({ ok: true, canceladas: 1, abortadas });
}
