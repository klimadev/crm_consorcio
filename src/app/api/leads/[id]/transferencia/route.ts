import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, whereLeadsPorPerfil } from "@/lib/permissoes";
import {
  esquemaCriarTransferencia,
  esquemaResponderTransferencia,
} from "@/lib/validacoes";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { badRequest, forbidden, notFound, ok, conflict } from "@/lib/api/http";
import { handleRouteError } from "@/lib/api/route-errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await exigirSessao(request);
    if (auth.erro) return auth.erro;

    // Temporário: permitir GERENTE e EMPRESA também para teste
    // if (auth.sessao.perfil !== "COLABORADOR") {
    //   return forbidden("Apenas colaboradores podem enviar convites de transferencia.");
    // }

    const { id } = await params;

    const body = await parseJson<unknown>(request);
    if (!body.ok) return body.response;

    const validacao = validateBody(esquemaCriarTransferencia, body.data);
    if (!validacao.ok) return validacao.response;

    const { id_funcionario_destino } = validacao.data;

    const whereLeads = await whereLeadsPorPerfil(auth.sessao);

    const lead = await prisma.lead.findFirst({
      where: { id, ...whereLeads },
      select: { id: true, id_funcionario: true, id_empresa: true },
    });

    if (!lead) return notFound("Lead nao encontrado.");

    if (lead.id_funcionario !== auth.sessao.id_usuario) {
      return forbidden("Voce so pode transferir seus proprios leads.");
    }

    if (id_funcionario_destino === auth.sessao.id_usuario) {
      return badRequest("Voce nao pode transferir um lead para si mesmo.");
    }

    const destinatario = await prisma.funcionario.findFirst({
      where: {
        id: id_funcionario_destino,
        id_empresa: auth.sessao.id_empresa,
        cargo: "COLABORADOR",
        ativo: true,
      },
      select: { id: true, id_pdv: true, nome: true },
    });

    if (!destinatario) {
      return badRequest("Destinatario invalido ou nao e um colaborador ativo.");
    }

    if (auth.sessao.id_pdv && destinatario.id_pdv !== auth.sessao.id_pdv) {
      return badRequest("O destinatario deve pertencer ao seu PDV.");
    }

    const pendente = await prisma.transferenciaLead.findFirst({
      where: { id_lead: lead.id, status: "PENDENTE" },
    });

    if (pendente) {
      return conflict("Este lead ja possui uma transferencia pendente.");
    }

    const transferencia = await prisma.transferenciaLead.create({
      data: {
        id_lead: lead.id,
        id_funcionario_origem: auth.sessao.id_usuario,
        id_funcionario_destino,
        status: "PENDENTE",
      },
      select: {
        id: true,
        status: true,
        criado_em: true,
        funcionario_origem: { select: { id: true, nome: true } },
        funcionario_destino: { select: { id: true, nome: true } },
      },
    });

    return ok(transferencia, 201);
  } catch (erro) {
    return handleRouteError(erro, "Erro ao criar transferencia.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await exigirSessao(request);
    if (auth.erro) return auth.erro;

    // Temporário: permitir GERENTE e EMPRESA também para teste
    // if (auth.sessao.perfil !== "COLABORADOR") {
    //   return forbidden("Apenas colaboradores podem responder a transferencias.");
    // }

    const { id } = await params;

    const body = await parseJson<unknown>(request);
    if (!body.ok) return body.response;

    const validacao = validateBody(esquemaResponderTransferencia, body.data);
    if (!validacao.ok) return validacao.response;

    const { acao } = validacao.data;

    const transferencia = await prisma.transferenciaLead.findFirst({
      where: {
        id_lead: id,
        id_funcionario_destino: auth.sessao.id_usuario,
        status: "PENDENTE",
      },
      include: {
        lead: { select: { id: true, id_funcionario: true, id_empresa: true } },
      },
    });

    if (!transferencia) {
      return notFound("Transferencia pendente nao encontrada para este lead.");
    }

    if (acao === "ACEITAR") {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: transferencia.id_lead },
          data: { id_funcionario: auth.sessao.id_usuario },
        });

        await tx.transferenciaLead.update({
          where: { id: transferencia.id },
          data: { status: "ACEITA", respondido_em: new Date() },
        });
      });

      return ok({ mensagem: "Transferencia aceita com sucesso." });
    }

    await prisma.transferenciaLead.update({
      where: { id: transferencia.id },
      data: { status: "RECUSADA", respondido_em: new Date() },
    });

    return ok({ mensagem: "Transferencia recusada." });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao responder transferencia.");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await exigirSessao(request);
    if (auth.erro) return auth.erro;

    // Temporário: permitir GERENTE e EMPRESA também para teste
    // if (auth.sessao.perfil !== "COLABORADOR") {
    //   return forbidden("Apenas colaboradores podem cancelar transferencias.");
    // }

    const { id } = await params;

    const transferencia = await prisma.transferenciaLead.findFirst({
      where: {
        id_lead: id,
        id_funcionario_origem: auth.sessao.id_usuario,
        status: "PENDENTE",
      },
    });

    if (!transferencia) {
      return notFound("Transferencia pendente nao encontrada para este lead.");
    }

    await prisma.transferenciaLead.update({
      where: { id: transferencia.id },
      data: { status: "RECUSADA", respondido_em: new Date() },
    });

    return ok({ mensagem: "Transferencia cancelada." });
  } catch (erro) {
    return handleRouteError(erro, "Erro ao cancelar transferencia.");
  }
}
