import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";
import { esquemaMoverLead, mensagemErroValidacao } from "@/lib/validacoes";
import { executarAutomacoesLeadStageChanged, cancelarAgendamentosPorLead } from "@/lib/whatsapp-automations";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    id_estagio?: string;
    motivo_perda?: string;
  };

  const validacao = esquemaMoverLead.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
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
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Validação de PDV para GERENTE
  if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
    if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
      return NextResponse.json(
        { erro: "Voce só pode mover leads do seu PDV." },
        { status: 403 }
      );
    }
  }

  const estagioDestino = await prisma.estagioFunil.findFirst({
    where: {
      id: dadosValidados.id_estagio,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!estagioDestino) {
    return NextResponse.json({ erro: "Estagio destino invalido." }, { status: 400 });
  }

  if (estagioDestino.tipo === "PERDIDO" && !dadosValidados.motivo_perda?.trim()) {
    return NextResponse.json({ erro: "Motivo de perda e obrigatorio." }, { status: 400 });
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
