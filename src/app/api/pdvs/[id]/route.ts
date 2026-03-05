import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa } from "@/lib/permissoes";
import { esquemaAtualizarPdv } from "@/lib/validacoes";
import { badRequest, forbidden, notFound } from "@/lib/api/http";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return forbidden("Somente EMPRESA pode alterar PDVs.");
  }

  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }
  const validacao = validateBody(esquemaAtualizarPdv, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const { id } = await params;
  const { nome, id_whatsapp_instancia } = validacao.data;

  if (id_whatsapp_instancia !== undefined && id_whatsapp_instancia !== null) {
    const instancia = await prisma.whatsappInstancia.findFirst({
      where: {
        id: id_whatsapp_instancia,
        id_empresa: auth.sessao.id_empresa,
      },
      select: { id: true },
    });

    if (!instancia) {
      return badRequest("Instancia WhatsApp invalida para a empresa.");
    }
  }

  const data: { nome?: string; id_whatsapp_instancia?: string | null } = {};
  if (nome !== undefined) data.nome = nome;
  if (id_whatsapp_instancia !== undefined) data.id_whatsapp_instancia = id_whatsapp_instancia;

  const atualizados = await prisma.pdv.updateMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
    data,
  });

  if (atualizados.count === 0) {
    return notFound("PDV nao encontrado.");
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return forbidden("Somente EMPRESA pode alterar PDVs.");
  }

  const { id } = await params;

  const funcionariosVinculados = await prisma.funcionario.count({
    where: {
      id_empresa: auth.sessao.id_empresa,
      id_pdv: id,
    },
  });

  if (funcionariosVinculados > 0) {
    return badRequest("Nao e possivel excluir PDV com colaboradores vinculados. Realoque-os antes de excluir.");
  }

  const deletados = await prisma.pdv.deleteMany({
    where: { id, id_empresa: auth.sessao.id_empresa },
  });

  if (deletados.count === 0) {
    return notFound("PDV nao encontrado.");
  }

  return NextResponse.json({ ok: true });
}
