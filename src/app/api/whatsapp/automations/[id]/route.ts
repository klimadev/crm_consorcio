import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaAtualizarAutomacaoWhatsapp, mensagemErroValidacao, STATUS_AUTOMACAO, STATUS_JOB } from "@/lib/validacoes";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;
  const body = (await request.json()) as {
    ativo?: boolean;
    id_whatsapp_instancia?: string;
    evento?: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
    id_estagio_destino?: string | null;
    tipo_destino?: "FIXO" | "LEAD_TELEFONE";
    telefone_destino?: string | null;
    mensagem?: string | null;
    horario_texto?: string;
    etapas?: Array<{
      ordem: number;
      delay_minutos: number;
      mensagem_template: string;
    }>;
  };

  const validacao = esquemaAtualizarAutomacaoWhatsapp.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dados = validacao.data;

  // Buscar automação existente
  const automacaoExistente = await prisma.whatsappAutomacao.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    include: { etapas: true },
  });

  if (!automacaoExistente) {
    return NextResponse.json({ erro: "Automação não encontrada." }, { status: 404 });
  }

  // Validar instância se fornecida
  if (dados.id_whatsapp_instancia) {
    const instancia = await prisma.whatsappInstancia.findFirst({
      where: {
        id: dados.id_whatsapp_instancia,
        id_empresa: auth.sessao.id_empresa,
      },
    });

    if (!instancia) {
      return NextResponse.json({ erro: "Instância de WhatsApp inválida." }, { status: 400 });
    }
  }

  // Validar estágio se fornecido
  if (dados.id_estagio_destino) {
    const estagio = await prisma.estagioFunil.findFirst({
      where: {
        id: dados.id_estagio_destino,
        id_empresa: auth.sessao.id_empresa,
      },
    });

    if (!estagio) {
      return NextResponse.json({ erro: "Estágio destino inválido." }, { status: 400 });
    }
  }

  // Processar horário textual (delay após trigger)
  let horarioRaw: string | null | undefined = undefined;
  let horarioNormalizado: string | null | undefined = undefined;
  let delayMinutos: number | null | undefined = undefined;
  let statusAutomacao: string | undefined = undefined;

  if (dados.horario_texto !== undefined) {
    if (dados.horario_texto && dados.horario_texto.trim().length > 0) {
      const resultadoHorario = parseHorarioTexto(dados.horario_texto);
      if (resultadoHorario.ok) {
        horarioRaw = resultadoHorario.raw;
        horarioNormalizado = resultadoHorario.normalized;
        delayMinutos = resultadoHorario.delay_minutos;
        statusAutomacao = automacaoExistente.status === STATUS_AUTOMACAO.ERRO_CONFIG 
          ? STATUS_AUTOMACAO.ATIVA 
          : undefined;
      } else {
        // Se horário inválido, marcar como erro de configuração
        statusAutomacao = STATUS_AUTOMACAO.ERRO_CONFIG;
      }
    } else {
      // Se horário removido/limpo
      horarioRaw = null;
      horarioNormalizado = null;
      delayMinutos = null;
    }
  }

  // Preparar dados de atualização
  const dadosUpdate: Parameters<typeof prisma.whatsappAutomacao.update>[0]["data"] = {
    ativo: dados.ativo,
    id_whatsapp_instancia: dados.id_whatsapp_instancia,
    evento: dados.evento,
    id_estagio_destino: dados.id_estagio_destino?.trim() || null,
    tipo_destino: dados.tipo_destino,
    telefone_destino: dados.tipo_destino === "FIXO" ? dados.telefone_destino?.trim() : null,
    mensagem: dados.evento === "LEAD_STAGE_CHANGED" ? dados.mensagem?.trim() ?? null : null,
  };

  // Adicionar campos de horário se foram fornecidos
  if (horarioRaw !== undefined) {
    (dadosUpdate as Record<string, unknown>).horario_raw = horarioRaw;
  }
  if (horarioNormalizado !== undefined) {
    (dadosUpdate as Record<string, unknown>).horario_normalizado = horarioNormalizado;
  }
  if (delayMinutos !== undefined) {
    (dadosUpdate as Record<string, unknown>).delay_minutos = delayMinutos;
  }
  if (statusAutomacao !== undefined) {
    (dadosUpdate as Record<string, unknown>).status = statusAutomacao;
    (dadosUpdate as Record<string, unknown>).job_status = statusAutomacao === STATUS_AUTOMACAO.ATIVA 
      ? STATUS_JOB.NOT_SCHEDULED 
      : STATUS_JOB.NOT_SCHEDULED;
  }

  const automacao = await prisma.$transaction(async (tx) => {
    // Atualizar automação principal
    const atualizada = await tx.whatsappAutomacao.update({
      where: { id: automacaoExistente.id },
      data: dadosUpdate,
    });

    // Se evento é LEAD_FOLLOW_UP e há etapas, atualizar etapas
    if (dados.evento === "LEAD_FOLLOW_UP" && dados.etapas) {
      // Remover etapas existentes
      await tx.whatsappAutomacaoEtapa.deleteMany({
        where: { id_whatsapp_automacao: automacaoExistente.id },
      });

      // Criar novas etapas
      if (dados.etapas.length > 0) {
        await tx.whatsappAutomacaoEtapa.createMany({
          data: dados.etapas.map((etapa) => ({
            id_empresa: auth.sessao.id_empresa,
            id_whatsapp_automacao: automacaoExistente.id,
            ordem: etapa.ordem,
            delay_minutos: etapa.delay_minutos,
            mensagem_template: etapa.mensagem_template,
          })),
        });
      }
    }

    // Se desativar, cancelar agendamentos pendentes
    if (dados.ativo === false) {
      await tx.whatsappAutomacaoAgendamento.updateMany({
        where: {
          id_empresa: auth.sessao.id_empresa,
          id_whatsapp_automacao: automacaoExistente.id,
          status: "PENDENTE",
        },
        data: {
          status: "CANCELADO",
          erro_ultimo: "Automação desativada.",
        },
      });

      // Atualizar status do job
      await tx.whatsappAutomacao.update({
        where: { id: automacaoExistente.id },
        data: {
          job_status: STATUS_JOB.NOT_SCHEDULED,
        },
      });
    }

    return tx.whatsappAutomacao.findFirstOrThrow({
      where: { id: automacaoExistente.id },
      include: {
        etapas: {
          orderBy: { ordem: "asc" },
        },
      },
    });
  });

  return NextResponse.json({ automacao });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const { id } = await params;

  // Buscar automação existente (ignorar já deletadas)
  const automacao = await prisma.whatsappAutomacao.findFirst({
    where: { 
      id, 
      id_empresa: auth.sessao.id_empresa,
      deleted_at: null,
    },
  });

  if (!automacao) {
    return NextResponse.json({ erro: "Automação não encontrada." }, { status: 404 });
  }

  // Soft delete - marcar deleted_at ao invés de deletar
  await prisma.$transaction(async (tx) => {
    // Cancelar agendamentos pendentes
    await tx.whatsappAutomacaoAgendamento.updateMany({
      where: {
        id_empresa: auth.sessao.id_empresa,
        id_whatsapp_automacao: automacao.id,
        status: "PENDENTE",
      },
      data: {
        status: "CANCELADO",
        erro_ultimo: "Automação excluída.",
      },
    });

    // Marcar automação como deletada (soft delete)
    await tx.whatsappAutomacao.update({
      where: { id: automacao.id },
      data: {
        deleted_at: new Date(),
        ativo: false,
        job_status: STATUS_JOB.DELETED,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
