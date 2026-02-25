import { prisma } from "@/lib/prisma";
import { enviarMensagemTexto } from "@/lib/evolution-api";
import { renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import { mascararTelefoneParaLog, normalizarTelefoneParaWhatsapp } from "@/lib/phone";

const EVENTO_LEAD_ESTAGIO_ALTERADO = "LEAD_STAGE_CHANGED";
const EVENTO_LEAD_FOLLOW_UP = "LEAD_FOLLOW_UP";
const DESTINO_FIXO = "FIXO";

// Status constants for clear state machine
const STATUS_PENDENTE = "PENDENTE";
const STATUS_PROCESSANDO = "PROCESSANDO";
const STATUS_ENVIADO = "ENVIADO";
const STATUS_FALHA = "FALHA";
const STATUS_CANCELADO = "CANCELADO";

// Metrics for observability
type DispatchMetrics = {
  jobsClaimed: number;
  jobsSkippedAlreadyClaimed: number;
  jobsDuplicateBlocked: number;
  jobsProcessed: number;
  jobsEnviados: number;
  jobsFalhas: number;
};

type ExecutarAutomacoesLeadStageChangedParams = {
  idEmpresa: string;
  lead: {
    id: string;
    nome: string;
    telefone: string;
  };
  estagioAnterior: {
    id: string;
    nome: string;
  };
  estagioNovo: {
    id: string;
    nome: string;
  };
  referenciaEvento?: string;
};

type ContextoTemplateAgendamento = {
  lead_nome: string;
  lead_telefone: string;
  lead_id: string;
  estagio_anterior: string;
  estagio_novo: string;
};

type FollowUpDispatchDetalhe = {
  agendamentoId: string;
  automacaoId: string;
  etapaId: string;
  leadId: string;
  tentativa: number;
  statusFinal: "ENVIADO" | "PENDENTE" | "FALHA" | "CANCELADO";
  telefoneE164: string | null;
  erro: string | null;
};

function criarRunId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function criarContextoTemplate(payload: ExecutarAutomacoesLeadStageChangedParams): ContextoTemplateAgendamento {
  return {
    lead_nome: payload.lead.nome,
    lead_telefone: payload.lead.telefone,
    lead_id: payload.lead.id,
    estagio_anterior: payload.estagioAnterior.nome,
    estagio_novo: payload.estagioNovo.nome,
  };
}

function resolverTelefoneDestino(
  automacao: { tipo_destino: string; telefone_destino: string | null },
  payload: ExecutarAutomacoesLeadStageChangedParams,
) {
  if (automacao.tipo_destino === DESTINO_FIXO) {
    return automacao.telefone_destino;
  }

  return payload.lead.telefone;
}

/**
 * Build deterministic idempotency key for follow-up scheduling
 * Format: {id_empresa}:{id_lead}:{id_estagio_trigger}:{id_whatsapp_automacao}:{id_etapa}
 * This ensures same lead+stage+automation+etapa always produces the same key
 */
function criarChaveIdempotencia(params: {
  idEmpresa: string;
  idLead: string;
  idEstagioTrigger: string;
  idAutomacao: string;
  idEtapa: string;
}): string {
  return `${params.idEmpresa}:${params.idLead}:${params.idEstagioTrigger}:${params.idAutomacao}:${params.idEtapa}`;
}

/**
 * Schedule follow-up with idempotency:
 * - If pending job exists for same (lead+stage+automation+etapa), cancel it and create new one
 * - This allows re-triggering when lead re-enters the same stage
 */
async function agendarFollowUpComIdempotencia(params: {
  idEmpresa: string;
  idLead: string;
  idEstagioTrigger: string;
  idAutomacao: string;
  idEtapa: string;
  delayMinutos: number;
  mensagemTemplate: string;
  contexto: ContextoTemplateAgendamento;
  runId: string;
}): Promise<{ agendado: boolean; substituido: boolean }> {
  const chaveIdempotencia = criarChaveIdempotencia({
    idEmpresa: params.idEmpresa,
    idLead: params.idLead,
    idEstagioTrigger: params.idEstagioTrigger,
    idAutomacao: params.idAutomacao,
    idEtapa: params.idEtapa,
  });

  const agendadoPara = new Date(Date.now() + params.delayMinutos * 60 * 1000);

  // Check if there's already a pending job for this idempotency key
  const agendamentoExistente = await prisma.whatsappAutomacaoAgendamento.findFirst({
    where: {
      id_empresa: params.idEmpresa,
      chave_idempotencia: chaveIdempotencia,
      status: { in: [STATUS_PENDENTE, STATUS_PROCESSANDO] },
    },
  });

  // If exists, cancel it first (allow re-trigger when lead re-enters stage)
  if (agendamentoExistente) {
    await prisma.whatsappAutomacaoAgendamento.update({
      where: { id: agendamentoExistente.id },
      data: {
        status: STATUS_CANCELADO,
        erro_ultimo: "Substituido por novo agendamento (lead re-entrou no estagio)",
      },
    });
    console.info(
      `[WA_AUTOMATION] runId=${params.runId} chaveIdempotencia=${chaveIdempotencia} status=REPLACE oldId=${agendamentoExistente.id}`,
    );
  }

  // Create new scheduling
  await prisma.whatsappAutomacaoAgendamento.create({
    data: {
      id_empresa: params.idEmpresa,
      id_whatsapp_automacao: params.idAutomacao,
      id_etapa: params.idEtapa,
      id_lead: params.idLead,
      id_estagio_trigger: params.idEstagioTrigger,
      chave_idempotencia: chaveIdempotencia,
      // Legacy field - keep for backwards compatibility
      referencia_evento: `${params.idLead}:${params.idEstagioTrigger}:${Date.now()}`,
      mensagem_template: params.mensagemTemplate,
      contexto_json: JSON.stringify(params.contexto),
      agendado_para: agendadoPara,
      status: STATUS_PENDENTE,
      tentativas: 0,
    },
  });

  return { agendado: true, substituido: !!agendamentoExistente };
}

export async function executarAutomacoesLeadStageChanged(
  payload: ExecutarAutomacoesLeadStageChangedParams,
) {
  const runId = criarRunId("lead-stage");

  // Busca ambos os tipos de automação (imediata e follow-up)
  const automacoes = await prisma.whatsappAutomacao.findMany({
    where: {
      id_empresa: payload.idEmpresa,
      evento: { in: [EVENTO_LEAD_ESTAGIO_ALTERADO, EVENTO_LEAD_FOLLOW_UP] },
      ativo: true,
      OR: [{ id_estagio_destino: null }, { id_estagio_destino: payload.estagioNovo.id }],
    },
  });

  if (!automacoes.length) {
    console.info(
      `[WA_AUTOMATION] runId=${runId} evento=LEAD_STAGE_CHANGED leadId=${payload.lead.id} automacoes=0`,
    );
    return;
  }

  const idsInstancias = Array.from(new Set(automacoes.map((item) => item.id_whatsapp_instancia)));
  const instancias = await prisma.whatsappInstancia.findMany({
    where: {
      id_empresa: payload.idEmpresa,
      id: { in: idsInstancias },
    },
  });

  const instanciaPorId = new Map(instancias.map((instancia) => [instancia.id, instancia]));

  const automacoesImediatas = automacoes.filter((automacao) => automacao.evento === EVENTO_LEAD_ESTAGIO_ALTERADO);
  const automacoesFollowUp = automacoes.filter((automacao) => automacao.evento === EVENTO_LEAD_FOLLOW_UP);
  const contexto = criarContextoTemplate(payload);

  console.info(
    `[WA_AUTOMATION] runId=${runId} leadId=${payload.lead.id} imediatas=${automacoesImediatas.length} followUps=${automacoesFollowUp.length} estagioTrigger=${payload.estagioNovo.id}`,
  );

  const enviosImediatos = automacoesImediatas.map(async (automacao) => {
    const instancia = instanciaPorId.get(automacao.id_whatsapp_instancia);
    const telefoneRaw = resolverTelefoneDestino(automacao, payload);
    if (!instancia || !automacao.mensagem || !telefoneRaw) {
      console.warn(
        `[WA_AUTOMATION] runId=${runId} tipo=imediata automacaoId=${automacao.id} status=IGNORADO motivo=dados_incompletos`,
      );
      return;
    }

    const telefoneNormalizado = normalizarTelefoneParaWhatsapp(telefoneRaw);
    if (!telefoneNormalizado.valido || !telefoneNormalizado.waNumber) {
      console.warn(
        `[WA_AUTOMATION] runId=${runId} tipo=imediata automacaoId=${automacao.id} status=IGNORADO motivo=telefone_invalido telefone=${mascararTelefoneParaLog(telefoneRaw)} detalhe=${telefoneNormalizado.motivoErro ?? "n/d"}`,
      );
      return;
    }

    const mensagem = renderizarTemplateWhatsapp(automacao.mensagem, contexto);
    try {
      await enviarMensagemTexto({
        instanceName: instancia.instance_name,
        telefone: telefoneNormalizado.waNumber,
        mensagem,
      });
      console.info(
        `[WA_AUTOMATION] runId=${runId} tipo=imediata automacaoId=${automacao.id} status=ENVIADO telefone=${mascararTelefoneParaLog(telefoneNormalizado.waNumber)}`,
      );
    } catch (erro) {
      const mensagemErro = erro instanceof Error ? erro.message : "Erro ao enviar automacao imediata.";
      console.error(
        `[WA_AUTOMATION] runId=${runId} tipo=imediata automacaoId=${automacao.id} status=ERRO telefone=${mascararTelefoneParaLog(telefoneNormalizado.waNumber)} detalhe=${mensagemErro}`,
      );
    }
  });

  // Schedule follow-ups with idempotency
  const idsAutomacoesFollowUp = automacoesFollowUp.map((item) => item.id);
  if (idsAutomacoesFollowUp.length) {
    const etapas = await prisma.whatsappAutomacaoEtapa.findMany({
      where: {
        id_empresa: payload.idEmpresa,
        id_whatsapp_automacao: { in: idsAutomacoesFollowUp },
        ativo: true,
      },
      orderBy: [{ id_whatsapp_automacao: "asc" }, { ordem: "asc" }],
    });

    let agendados = 0;
    let substituidos = 0;

    for (const automacao of automacoesFollowUp) {
      const etapasDaAutomacao = etapas.filter((etapa) => etapa.id_whatsapp_automacao === automacao.id);
      
      for (const etapa of etapasDaAutomacao) {
        const resultado = await agendarFollowUpComIdempotencia({
          idEmpresa: payload.idEmpresa,
          idLead: payload.lead.id,
          idEstagioTrigger: payload.estagioNovo.id,
          idAutomacao: automacao.id,
          idEtapa: etapa.id,
          delayMinutos: etapa.delay_minutos,
          mensagemTemplate: etapa.mensagem_template,
          contexto,
          runId,
        });
        
        if (resultado.agendado) {
          agendados++;
          if (resultado.substituido) {
            substituidos++;
          }
        }
      }
    }

    console.info(
      `[WA_AUTOMATION] runId=${runId} tipo=follow-up agendados=${agendados} substituidos=${substituidos} estagioTrigger=${payload.estagioNovo.id}`,
    );
  }

  await Promise.allSettled(enviosImediatos);
}

/**
 * Recovery: Reset stale PROCESSANDO jobs that have been stuck for too long
 * These are jobs that were claimed but the worker crashed before completing
 */
async function recuperarStaleProcessando(params: {
  idEmpresa?: string;
  limite?: number;
  timeoutMinutos?: number;
}): Promise<number> {
  const timeoutMinutos = params.timeoutMinutos ?? 15; // Consider stale after 15 minutes
  
  const resultado = await prisma.whatsappAutomacaoAgendamento.updateMany({
    where: {
      ...(params.idEmpresa ? { id_empresa: params.idEmpresa } : {}),
      status: STATUS_PROCESSANDO,
      atualizado_em: {
        lt: new Date(Date.now() - timeoutMinutos * 60 * 1000),
      },
    },
    data: {
      status: STATUS_PENDENTE,
      erro_ultimo: "Recovered from stale PROCESSANDO",
    },
  });

  return resultado.count;
}

/**
 * Atomic claim-lock: atomically claim a job by updating status from PENDENTE to PROCESSANDO
 * Returns the claimed job or null if already claimed by another worker
 */
async function claimJob(params: {
  id: string;
  idEmpresa: string;
}): Promise<{ success: boolean; chaveIdempotencia?: string }> {
  const resultado = await prisma.whatsappAutomacaoAgendamento.updateMany({
    where: {
      id: params.id,
      id_empresa: params.idEmpresa,
      status: STATUS_PENDENTE, // Only claim if still PENDENTE
    },
    data: {
      status: STATUS_PROCESSANDO,
    },
  });

  if (resultado.count === 0) {
    // Already claimed by another worker
    return { success: false };
  }

  // Get the idempotency key for logging
  const agendamento = await prisma.whatsappAutomacaoAgendamento.findUnique({
    where: { id: params.id },
    select: { chave_idempotencia: true },
  });

  return { 
    success: true, 
    chaveIdempotencia: agendamento?.chave_idempotencia ?? "unknown" 
  };
}

/**
 * Cancels all pending follow-up jobs for a lead when they leave a stage.
 * This ensures a lead never has 2 follow-up jobs running simultaneously.
 * If idEstagioSaindo is provided, only cancels jobs from that specific stage.
 * If not provided, cancels ALL pending jobs for the lead.
 */
export async function cancelarAgendamentosPorLead(params: {
  idEmpresa: string;
  idLead: string;
  idEstagioSaindo?: string;
  motivo?: string;
}): Promise<number> {
  const whereClause: Parameters<typeof prisma.whatsappAutomacaoAgendamento.findFirst>[0]["where"] = {
    id_empresa: params.idEmpresa,
    id_lead: params.idLead,
    status: { in: [STATUS_PENDENTE, STATUS_PROCESSANDO] },
  };

  if (params.idEstagioSaindo) {
    whereClause.id_estagio_trigger = params.idEstagioSaindo;
  }

  const resultado = await prisma.whatsappAutomacaoAgendamento.updateMany({
    where: whereClause,
    data: {
      status: STATUS_CANCELADO,
      erro_ultimo: params.motivo ?? "Lead saiu do estágio trigger.",
    },
  });

  if (resultado.count > 0) {
    console.info(
      `[WA_AUTOMATION] leadId=${params.idLead} estagioSaindo=${params.idEstagioSaindo ?? "todos"} cancelados=${resultado.count} motivo=${params.motivo ?? "lead_saiu_estagio"}`,
    );
  }

  return resultado.count;
}

export async function processarAgendamentosFollowUpWhatsapp(params?: {
  limite?: number;
  idEmpresa?: string;
  origem?: string;
}) {
  const limite = params?.limite ?? 50;
  const runId = criarRunId("dispatch");

  // Step 1: Recover stale PROCESSANDO jobs first
  const recoveredCount = await recuperarStaleProcessando({
    idEmpresa: params?.idEmpresa,
    limite: 100,
    timeoutMinutos: 15,
  });

  if (recoveredCount > 0) {
    console.info(`[WA_DISPATCH] runId=${runId} recoveredStale=${recoveredCount}`);
  }

  // Step 2: Find pending jobs due for processing
  const agendamentos = await prisma.whatsappAutomacaoAgendamento.findMany({
    where: {
      ...(params?.idEmpresa ? { id_empresa: params.idEmpresa } : {}),
      status: STATUS_PENDENTE,
      agendado_para: { lte: new Date() },
    },
    orderBy: { agendado_para: "asc" },
    take: limite,
    select: {
      id: true,
      id_empresa: true,
      id_whatsapp_automacao: true,
      id_etapa: true,
      id_lead: true,
      chave_idempotencia: true,
      tentativas: true,
    },
  });

  if (!agendamentos.length) {
    console.info(
      `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} processados=0 enviados=0 falhas=0`,
    );
    return { 
      runId, 
      processados: 0, 
      enviados: 0, 
      falhas: 0, 
      detalhes: [] as FollowUpDispatchDetalhe[],
      metrics: {
        jobsClaimed: 0,
        jobsSkippedAlreadyClaimed: 0,
        jobsDuplicateBlocked: 0,
        jobsProcessed: 0,
        jobsEnviados: 0,
        jobsFalhas: 0,
      }
    };
  }

  console.info(
    `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} encontrados=${agendamentos.length} limite=${limite}`,
  );

  // Metrics for observability
  const metrics: DispatchMetrics = {
    jobsClaimed: 0,
    jobsSkippedAlreadyClaimed: 0,
    jobsDuplicateBlocked: 0,
    jobsProcessed: 0,
    jobsEnviados: 0,
    jobsFalhas: 0,
  };

  let enviados = 0;
  let falhas = 0;
  const detalhes: FollowUpDispatchDetalhe[] = [];

  // Step 3: Process each job with atomic claim-lock
  for (const agendamentoBase of agendamentos) {
    // Try to atomically claim this job
    const claimResult = await claimJob({
      id: agendamentoBase.id,
      idEmpresa: agendamentoBase.id_empresa,
    });

    if (!claimResult.success) {
      metrics.jobsSkippedAlreadyClaimed++;
      console.info(
        `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamentoBase.id} chaveIdempotencia=${agendamentoBase.chave_idempotencia ?? "unknown"} status=SKIPPED_ALREADY_CLAIMED`,
      );
      continue;
    }

    // Successfully claimed
    metrics.jobsClaimed++;
    console.info(
      `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamentoBase.id} chaveIdempotencia=${claimResult.chaveIdempotencia} status=CLAIMED`,
    );

    try {
      // Get full agendamento data for processing
      const agendamento = await prisma.whatsappAutomacaoAgendamento.findUnique({
        where: { id: agendamentoBase.id },
      });

      if (!agendamento) {
        metrics.jobsSkippedAlreadyClaimed++;
        continue;
      }

      // Check if already sent (idempotency double-check)
      if (agendamento.status === STATUS_ENVIADO || agendamento.status === STATUS_CANCELADO) {
        metrics.jobsDuplicateBlocked++;
        console.info(
          `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamento.id} chaveIdempotencia=${agendamento.chave_idempotencia ?? "unknown"} status=SKIPPED_ALREADY_SENT`,
        );
        continue;
      }

      const automacao = await prisma.whatsappAutomacao.findFirst({
        where: {
          id: agendamento.id_whatsapp_automacao,
          id_empresa: agendamento.id_empresa,
          evento: EVENTO_LEAD_FOLLOW_UP,
          ativo: true,
        },
      });

      if (!automacao) {
        await prisma.whatsappAutomacaoAgendamento.update({
          where: { id: agendamento.id },
          data: { status: STATUS_CANCELADO, erro_ultimo: "Automacao inativa ou inexistente." },
        });
        detalhes.push({
          agendamentoId: agendamento.id,
          automacaoId: agendamento.id_whatsapp_automacao,
          etapaId: agendamento.id_etapa,
          leadId: agendamento.id_lead,
          tentativa: agendamento.tentativas,
          statusFinal: "CANCELADO",
          telefoneE164: null,
          erro: "Automacao inativa ou inexistente.",
        });
        console.warn(
          `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamento.id} status=CANCELADO motivo=automacao_inativa`,
        );
        metrics.jobsProcessed++;
        continue;
      }

      const instancia = await prisma.whatsappInstancia.findFirst({
        where: {
          id: automacao.id_whatsapp_instancia,
          id_empresa: agendamento.id_empresa,
        },
      });

      if (!instancia) {
        throw new Error("Instancia de WhatsApp nao encontrada.");
      }

      const contexto = JSON.parse(agendamento.contexto_json) as ContextoTemplateAgendamento;
      const telefoneRaw = automacao.tipo_destino === DESTINO_FIXO
        ? automacao.telefone_destino
        : contexto.lead_telefone;

      if (!telefoneRaw) {
        throw new Error("Telefone destino nao definido.");
      }

      const telefoneNormalizado = normalizarTelefoneParaWhatsapp(telefoneRaw);
      if (!telefoneNormalizado.valido || !telefoneNormalizado.waNumber || !telefoneNormalizado.e164) {
        throw new Error(telefoneNormalizado.motivoErro ?? "Telefone invalido para envio.");
      }

      const mensagem = renderizarTemplateWhatsapp(agendamento.mensagem_template, contexto);

      console.info(
        `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamento.id} automacaoId=${automacao.id} etapaId=${agendamento.id_etapa} leadId=${agendamento.id_lead} tentativa=${agendamento.tentativas} telefone=${mascararTelefoneParaLog(telefoneNormalizado.waNumber)} status=ENVIANDO`,
      );

      await enviarMensagemTexto({
        instanceName: instancia.instance_name,
        telefone: telefoneNormalizado.waNumber,
        mensagem,
      });

      // Success - mark as sent
      await prisma.whatsappAutomacaoAgendamento.update({
        where: { id: agendamento.id },
        data: {
          status: STATUS_ENVIADO,
          enviado_em: new Date(),
          erro_ultimo: null,
        },
      });

      enviados += 1;
      metrics.jobsEnviados++;
      metrics.jobsProcessed++;

      detalhes.push({
        agendamentoId: agendamento.id,
        automacaoId: agendamento.id_whatsapp_automacao,
        etapaId: agendamento.id_etapa,
        leadId: agendamento.id_lead,
        tentativa: agendamento.tentativas,
        statusFinal: "ENVIADO",
        telefoneE164: telefoneNormalizado.e164,
        erro: null,
      });

      console.info(
        `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamento.id} status=ENVIADO telefone=${mascararTelefoneParaLog(telefoneNormalizado.waNumber)}`,
      );
    } catch (erro) {
      falhas += 1;
      metrics.jobsFalhas++;
      metrics.jobsProcessed++;

      const tentativas = agendamentoBase.tentativas + 1;
      const status = tentativas >= 3 ? STATUS_FALHA : STATUS_PENDENTE;
      const proximaExecucao =
        status === STATUS_PENDENTE
          ? new Date(Date.now() + tentativas * 5 * 60 * 1000)
          : new Date();

      await prisma.whatsappAutomacaoAgendamento.update({
        where: { id: agendamentoBase.id },
        data: {
          tentativas,
          status,
          agendado_para: proximaExecucao,
          erro_ultimo: erro instanceof Error ? erro.message : "Erro ao enviar follow-up.",
        },
      });

      const mensagemErro = erro instanceof Error ? erro.message : "Erro ao enviar follow-up.";
      detalhes.push({
        agendamentoId: agendamentoBase.id,
        automacaoId: agendamentoBase.id_whatsapp_automacao,
        etapaId: agendamentoBase.id_etapa,
        leadId: agendamentoBase.id_lead,
        tentativa: tentativas,
        statusFinal: status === STATUS_FALHA ? "FALHA" : "PENDENTE",
        telefoneE164: null,
        erro: mensagemErro,
      });

      console.error(
        `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamentoBase.id} status=${status} tentativa=${tentativas} detalhe=${mensagemErro}`,
      );
    }
  }

  console.info(
    `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} processados=${metrics.jobsProcessed} enviados=${enviados} falhas=${falhas} metricsClaimed=${metrics.jobsClaimed} metricsSkipped=${metrics.jobsSkippedAlreadyClaimed}`,
  );

  return {
    runId,
    processados: metrics.jobsProcessed,
    enviados,
    falhas,
    detalhes,
    metrics,
  };
}
