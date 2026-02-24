import { prisma } from "@/lib/prisma";
import { enviarMensagemTexto } from "@/lib/evolution-api";
import { renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import { mascararTelefoneParaLog, normalizarTelefoneParaWhatsapp } from "@/lib/phone";

const EVENTO_LEAD_ESTAGIO_ALTERADO = "LEAD_STAGE_CHANGED";
const EVENTO_LEAD_FOLLOW_UP = "LEAD_FOLLOW_UP";
const DESTINO_FIXO = "FIXO";

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
    `[WA_AUTOMATION] runId=${runId} leadId=${payload.lead.id} imediatas=${automacoesImediatas.length} followUps=${automacoesFollowUp.length} referencia=${payload.referenciaEvento ?? "auto"}`,
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

    const referenciaEvento = payload.referenciaEvento ?? `${payload.lead.id}:${Date.now()}`;

    const agendamentos = automacoesFollowUp.flatMap((automacao) => {
      return etapas
        .filter((etapa) => etapa.id_whatsapp_automacao === automacao.id)
        .map((etapa) => {
          const agendadoPara = new Date(Date.now() + etapa.delay_minutos * 60 * 1000);
          return prisma.whatsappAutomacaoAgendamento.upsert({
            where: {
              id_whatsapp_automacao_id_etapa_id_lead_referencia_evento: {
                id_whatsapp_automacao: automacao.id,
                id_etapa: etapa.id,
                id_lead: payload.lead.id,
                referencia_evento: referenciaEvento,
              },
            },
            update: {
              agendado_para: agendadoPara,
              status: "PENDENTE",
              tentativas: 0,
              erro_ultimo: null,
              contexto_json: JSON.stringify(contexto),
              mensagem_template: etapa.mensagem_template,
            },
            create: {
              id_empresa: payload.idEmpresa,
              id_whatsapp_automacao: automacao.id,
              id_etapa: etapa.id,
              id_lead: payload.lead.id,
              referencia_evento: referenciaEvento,
              mensagem_template: etapa.mensagem_template,
              contexto_json: JSON.stringify(contexto),
              agendado_para: agendadoPara,
              status: "PENDENTE",
              tentativas: 0,
            },
          });
        });
    });

    const resultadoAgendamentos = await Promise.allSettled(agendamentos);
    const agendados = resultadoAgendamentos.filter((item) => item.status === "fulfilled").length;
    const falhas = resultadoAgendamentos.length - agendados;
    console.info(
      `[WA_AUTOMATION] runId=${runId} tipo=follow-up agendados=${agendados} falhas=${falhas} referencia=${referenciaEvento}`,
    );
  }

  await Promise.allSettled(enviosImediatos);
}

export async function processarAgendamentosFollowUpWhatsapp(params?: {
  limite?: number;
  idEmpresa?: string;
  origem?: string;
}) {
  const limite = params?.limite ?? 50;
  const runId = criarRunId("dispatch");

  const agendamentos = await prisma.whatsappAutomacaoAgendamento.findMany({
    where: {
      ...(params?.idEmpresa ? { id_empresa: params.idEmpresa } : {}),
      status: "PENDENTE",
      agendado_para: { lte: new Date() },
    },
    orderBy: { agendado_para: "asc" },
    take: limite,
  });

  if (!agendamentos.length) {
    console.info(
      `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} processados=0 enviados=0 falhas=0`,
    );
    return { runId, processados: 0, enviados: 0, falhas: 0, detalhes: [] as FollowUpDispatchDetalhe[] };
  }

  console.info(
    `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} encontrados=${agendamentos.length} limite=${limite}`,
  );

  let enviados = 0;
  let falhas = 0;
  const detalhes: FollowUpDispatchDetalhe[] = [];

  for (const agendamento of agendamentos) {
    try {
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
          data: { status: "CANCELADO", erro_ultimo: "Automacao inativa ou inexistente." },
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

      enviados += 1;
      await prisma.whatsappAutomacaoAgendamento.update({
        where: { id: agendamento.id },
        data: {
          status: "ENVIADO",
          enviado_em: new Date(),
          erro_ultimo: null,
        },
      });

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
      const tentativas = agendamento.tentativas + 1;
      const status = tentativas >= 3 ? "FALHA" : "PENDENTE";
      const proximaExecucao =
        status === "PENDENTE"
          ? new Date(Date.now() + tentativas * 5 * 60 * 1000)
          : agendamento.agendado_para;

      await prisma.whatsappAutomacaoAgendamento.update({
        where: { id: agendamento.id },
        data: {
          tentativas,
          status,
          agendado_para: proximaExecucao,
          erro_ultimo: erro instanceof Error ? erro.message : "Erro ao enviar follow-up.",
        },
      });

      const mensagemErro = erro instanceof Error ? erro.message : "Erro ao enviar follow-up.";
      detalhes.push({
        agendamentoId: agendamento.id,
        automacaoId: agendamento.id_whatsapp_automacao,
        etapaId: agendamento.id_etapa,
        leadId: agendamento.id_lead,
        tentativa: tentativas,
        statusFinal: status,
        telefoneE164: null,
        erro: mensagemErro,
      });

      console.error(
        `[WA_DISPATCH] runId=${runId} agendamentoId=${agendamento.id} status=${status} tentativa=${tentativas} detalhe=${mensagemErro}`,
      );
    }
  }

  console.info(
    `[WA_DISPATCH] runId=${runId} origem=${params?.origem ?? "interno"} processados=${agendamentos.length} enviados=${enviados} falhas=${falhas}`,
  );

  return {
    runId,
    processados: agendamentos.length,
    enviados,
    falhas,
    detalhes,
  };
}
