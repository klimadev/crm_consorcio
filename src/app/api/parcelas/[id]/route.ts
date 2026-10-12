import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaAtualizarParcela } from "@/lib/validacoes";
import { badRequest, notFound, ok } from "@/lib/api/http";
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

  if (parcela.status === "CANCELADA" || parcela.status === "ABORTADA") {
    return badRequest("Parcela cancelada ou encerrada não pode ser editada. Reabra a parcela primeiro.");
  }

  const dados = validacao.data;
  const proximaDataPagamento =
    dados.data_pagamento === undefined
      ? parcela.data_pagamento
      : dados.data_pagamento === null
        ? null
        : new Date(dados.data_pagamento);
  const proximoStatus =
    dados.status ?? (dados.data_pagamento !== undefined ? (proximaDataPagamento ? "PAGA" : "AGUARDANDO") : parcela.status);

  const atualizada = await prisma.parcela.update({
    where: { id: parcela.id },
    data: {
      valor: dados.valor ?? parcela.valor,
      data_vencimento: dados.data_vencimento ? new Date(dados.data_vencimento) : parcela.data_vencimento,
      status: proximoStatus === "PAGA" ? "PAGA" : proximoStatus === "ATRASADA" ? "ATRASADA" : "AGUARDANDO",
      data_pagamento: proximoStatus === "PAGA" ? proximaDataPagamento : null,
      ...(dados.observacao_cobranca !== undefined ? { observacao_cobranca: dados.observacao_cobranca } : {}),
    },
  });

  return NextResponse.json({ parcela: atualizada });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const { id } = await params;

  const parcela = await prisma.parcela.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    include: { lead: { select: { id: true } } },
  });

  if (!parcela) {
    return notFound("Parcela não encontrada.");
  }

  if (parcela.status === "PAGA" || parcela.data_pagamento) {
    return badRequest("Não é possível excluir uma parcela já paga.");
  }

  const wherePermitido = await whereLeadsPorPerfil(auth.sessao);
  const leadPermitido = await prisma.lead.findFirst({
    where: { id: parcela.lead.id, ...wherePermitido },
    select: { id: true },
  });

  if (!leadPermitido) {
    return notFound("Parcela não encontrada.");
  }

  await prisma.parcela.delete({ where: { id: parcela.id } });

  return ok({ excluida: true, parcela });
}
