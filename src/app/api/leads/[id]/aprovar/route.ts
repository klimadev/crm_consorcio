import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withSessao } from "@/lib/api/route-guards";
import { ok, badRequest, forbidden, notFound } from "@/lib/api/http";
import { podeAprovarLead, podeGerenciarRecursoNoPdv } from "@/lib/permissoes";
import { esquemaAprovarLead } from "@/lib/validacoes";
import { parseJson, validateBody } from "@/lib/api/route-validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  return withSessao(request, async ({ sessao }) => {
    if (!podeAprovarLead(sessao)) {
      return forbidden("Apenas ADMIN da empresa pode aprovar leads.");
    }

    const { id } = await params;
    const body = await parseJson<unknown>(request);
    if (!body.ok) {
      return body.response;
    }

    const validacao = validateBody(esquemaAprovarLead, body.data ?? {});
    if (!validacao.ok) {
      return validacao.response;
    }

    const dataAprovacao = validacao.data.data_aprovacao
      ? new Date(`${validacao.data.data_aprovacao}T12:00:00.000Z`)
      : new Date();

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        id_empresa: sessao.id_empresa,
      },
      include: {
        funcionario: {
          select: {
            id_pdv: true,
          },
        },
        estagio: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
      },
    });

    if (!lead) {
      return notFound("Lead nao encontrado.");
    }

    if (!podeGerenciarRecursoNoPdv(sessao, lead.funcionario?.id_pdv ?? null)) {
      return forbidden("Sem permissao para aprovar lead de outro PDV.");
    }

    if (lead.estagio.nome !== "Pré Aprovação") {
      return badRequest("Lead precisa estar no estagio 'Pré Aprovação' para ser aprovado.");
    }

    if (!lead.documento_aprovacao_url) {
      return badRequest("Lead precisa ter documento de aprovação antes de ser aprovado.");
    }

    if (lead.aprovado_em) {
      return ok({ lead, mensagem: "Lead já foi aprovado." });
    }

    const leadAtualizado = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        aprovado_em: dataAprovacao,
        aprovado_por: sessao.id_usuario,
      },
    });

    return ok({ lead: leadAtualizado });
  });
}
