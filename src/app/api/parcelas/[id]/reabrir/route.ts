import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, respostaSemPermissao, whereLeadsPorPerfil } from "@/lib/permissoes";
import { esquemaReabrirParcela } from "@/lib/validacoes";
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

  // Apenas EMPRESA ou GERENTE podem reabrir parcelas
  if (auth.sessao.perfil === "COLABORADOR") {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaReabrirParcela, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const wherePermitido = await whereLeadsPorPerfil(auth.sessao);
  const parcela = await prisma.parcela.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa, lead: wherePermitido },
  });

  if (!parcela) {
    return notFound("Parcela não encontrada.");
  }

  if (parcela.status !== "CANCELADA" && parcela.status !== "ABORTADA") {
    return badRequest("Apenas parcelas canceladas ou encerradas podem ser reabertas.");
  }

  const reaberta = await prisma.parcela.update({
    where: { id: parcela.id },
    data: {
      status: "AGUARDANDO",
      motivo_cancelamento: null,
      cancelado_em: null,
      cancelado_por: null,
    },
  });

  return NextResponse.json({ ok: true, parcela: reaberta });
}
