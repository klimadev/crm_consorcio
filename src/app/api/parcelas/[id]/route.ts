import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaAtualizarParcela } from "@/lib/validacoes";
import { notFound } from "@/lib/api/http";
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

  const validacao = validateBody(esquemaAtualizarParcela, body.data);
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
    return notFound("Parcela nao encontrada.");
  }

  const wherePermitido = await whereLeadsPorPerfil(auth.sessao);
  const leadPermitido = await prisma.lead.findFirst({
    where: { id: parcela.lead.id, ...wherePermitido },
    select: { id: true },
  });

  if (!leadPermitido) {
    return notFound("Parcela nao encontrada.");
  }

  const dados = validacao.data;
  const proximaDataPagamento =
    dados.data_pagamento === undefined
      ? parcela.data_pagamento
      : dados.data_pagamento === null
        ? null
        : new Date(dados.data_pagamento);
  const proximoStatus =
    dados.status ?? (dados.data_pagamento !== undefined ? (proximaDataPagamento ? "PAGO" : "PENDENTE") : parcela.status);

  const atualizada = await prisma.parcela.update({
    where: { id: parcela.id },
    data: {
      valor: dados.valor ?? parcela.valor,
      data_vencimento: dados.data_vencimento ? new Date(dados.data_vencimento) : parcela.data_vencimento,
      status: proximoStatus === "PAGO" ? "PAGO" : "PENDENTE",
      data_pagamento: proximoStatus === "PAGO" ? proximaDataPagamento : null,
    },
  });

  return NextResponse.json({ parcela: atualizada });
}
