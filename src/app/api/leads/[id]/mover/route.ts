import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaMoverLead } from "@/lib/validacoes";
import { executarAutomacoesLeadStageChanged, cancelarAgendamentosPorLead } from "@/lib/whatsapp-automations";
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

  const { id } = await params;
  const body = await parseJson<unknown>(request);
  if (!body.ok) {
    return body.response;
  }

  const validacao = validateBody(esquemaMoverLead, body.data);
  if (!validacao.ok) {
    return validacao.response;
  }

  const dadosValidados = validacao.data;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
      ...(auth.sessao.perfil === "COLABORADOR"
        ? { id_funcionario: auth.sessao.id_usuario }
        : {}),
    },
    include: {
      estagio: {
        select: {
          id: true,
          nome: true,
          tipo: true,
        },
      },
      funcionario: {
        select: {
          id_pdv: true,
        },
      },
    },
  });

  if (!lead) {
    return notFound("Lead nao encontrado.");
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return forbidden("Voce só pode mover leads do seu PDV.");
    }
  }

  const estagioDestino = await prisma.estagioFunil.findFirst({
    where: {
      id: dadosValidados.id_estagio,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!estagioDestino) {
    return badRequest("Estagio destino invalido.");
  }

  if (estagioDestino.tipo === "PERDIDO" && !dadosValidados.motivo_perda?.trim()) {
    return badRequest("Motivo de perda e obrigatorio.");
  }

  const isMovingToGanho = estagioDestino.tipo === "GANHO";
  const hasAprovacao = Boolean(lead.aprovado_em && lead.aprovado_por);
  let estagioEfetivo = estagioDestino;
  let mensagemMovimentacao: string | undefined;

  if (isMovingToGanho && !hasAprovacao) {
    const estagioPreAprovacao = await prisma.estagioFunil.findFirst({
      where: {
        id_empresa: auth.sessao.id_empresa,
        nome: "Pré Aprovação",
        tipo: "ABERTO",
      },
    });

    if (!estagioPreAprovacao) {
      return NextResponse.json(
        { erro: "Estágio Pré Aprovação não configurado para esta empresa." },
        { status: 400 },
      );
    }

    estagioEfetivo = estagioPreAprovacao;
    mensagemMovimentacao = "Lead enviado para Pré Aprovação com pendência de análise da EMPRESA. Aprovação da EMPRESA é obrigatória antes de Fechado.";
  }

  // Same-stage no-op guard: skip automation scheduling if lead is already in destination stage
  if (lead.estagio.id === estagioEfetivo.id) {
    console.info(`[LEAD_MOVE] leadId=${lead.id} status=NOOP motivo=mesmo_estagio`);
    return NextResponse.json({ 
      lead, 
      mensagem: "Lead ja esta neste estagio.",
      noop: true 
    });
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      id_estagio: estagioEfetivo.id,
      motivo_perda: estagioEfetivo.tipo === "PERDIDO" ? dadosValidados.motivo_perda?.trim() : null,
      aprovado_em: estagioEfetivo.tipo === "ABERTO" ? null : undefined,
      aprovado_por: estagioEfetivo.tipo === "ABERTO" ? null : undefined,
    },
  });

  const referenciaEvento = `${lead.id}:${Date.now()}`;

  try {
    // Cancel all pending follow-up jobs when lead leaves a stage
    // This ensures a lead never has 2 follow-up jobs running simultaneously
    await cancelarAgendamentosPorLead({
      idEmpresa: auth.sessao.id_empresa,
      idLead: lead.id,
      idEstagioSaindo: lead.estagio.id, // Cancel jobs from the stage the lead is leaving
      motivo: "Lead mudou de estágio",
    });

    await executarAutomacoesLeadStageChanged({
      idEmpresa: auth.sessao.id_empresa,
      lead: {
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
      },
      estagioAnterior: {
        id: lead.estagio.id,
        nome: lead.estagio.nome,
      },
      estagioNovo: {
        id: estagioEfetivo.id,
        nome: estagioEfetivo.nome,
      },
      referenciaEvento,
    });
  } catch (erro) {
    console.error("Erro ao executar automacoes WhatsApp para lead:", erro);
  }

  return NextResponse.json({ lead: leadAtualizado, mensagem: mensagemMovimentacao });
}
