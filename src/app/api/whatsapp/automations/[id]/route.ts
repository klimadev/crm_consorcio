import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPerfis } from "@/lib/api/route-guards";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { ok, badRequest, notFound } from "@/lib/api/http";
import { esquemaAtualizarAutomacaoWhatsapp, STATUS_AUTOMACAO, STATUS_JOB } from "@/lib/validacoes";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const { id } = await params;
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const validacao = validateBody(esquemaAtualizarAutomacaoWhatsapp, parseResult.data);
    if (!validacao.ok) return validacao.response;

    const dados = validacao.data;

    const automacaoExistente = await prisma.whatsappAutomacao.findFirst({
      where: { id, id_empresa: sessao.id_empresa },
      include: { etapas: true },
    });

    if (!automacaoExistente) {
      return notFound("Automação não encontrada.");
    }

    if (dados.id_whatsapp_instancia) {
      const instancia = await prisma.whatsappInstancia.findFirst({
        where: {
          id: dados.id_whatsapp_instancia,
          id_empresa: sessao.id_empresa,
        },
      });

      if (!instancia) {
        return badRequest("Instância de WhatsApp inválida.");
      }
    }

    if (dados.id_estagio_destino) {
      const estagio = await prisma.estagioFunil.findFirst({
        where: {
          id: dados.id_estagio_destino,
          id_empresa: sessao.id_empresa,
        },
      });

      if (!estagio) {
        return badRequest("Estágio destino inválido.");
      }
    }

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
          statusAutomacao = STATUS_AUTOMACAO.ERRO_CONFIG;
        }
      } else {
        horarioRaw = null;
        horarioNormalizado = null;
        delayMinutos = null;
      }
    }

    const dadosUpdate: Parameters<typeof prisma.whatsappAutomacao.update>[0]["data"] = {
      ativo: dados.ativo,
      id_whatsapp_instancia: dados.id_whatsapp_instancia,
      evento: dados.evento,
      id_estagio_destino: dados.id_estagio_destino?.trim() || null,
      tipo_destino: dados.tipo_destino,
      telefone_destino: dados.tipo_destino === "FIXO" ? dados.telefone_destino?.trim() : null,
      mensagem: dados.evento === "LEAD_STAGE_CHANGED" ? dados.mensagem?.trim() ?? null : null,
    };

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
      await tx.whatsappAutomacao.update({
        where: { id: automacaoExistente.id },
        data: dadosUpdate,
      });

      if (dados.evento === "LEAD_FOLLOW_UP" && dados.etapas) {
        await tx.whatsappAutomacaoEtapa.deleteMany({
          where: { id_whatsapp_automacao: automacaoExistente.id },
        });

        if (dados.etapas.length > 0) {
          await tx.whatsappAutomacaoEtapa.createMany({
            data: dados.etapas.map((etapa) => ({
              id_empresa: sessao.id_empresa,
              id_whatsapp_automacao: automacaoExistente.id,
              ordem: etapa.ordem,
              delay_minutos: etapa.delay_minutos,
              mensagem_template: etapa.mensagem_template,
            })),
          });
        }
      }

      if (dados.ativo === false) {
        await tx.whatsappAutomacaoAgendamento.updateMany({
          where: {
            id_empresa: sessao.id_empresa,
            id_whatsapp_automacao: automacaoExistente.id,
            status: "PENDENTE",
          },
          data: {
            status: "CANCELADO",
            erro_ultimo: "Automação desativada.",
          },
        });

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

    return ok({ automacao });
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const { id } = await params;

    const automacao = await prisma.whatsappAutomacao.findFirst({
      where: { 
        id, 
        id_empresa: sessao.id_empresa,
        deleted_at: null,
      },
    });

    if (!automacao) {
      return notFound("Automação não encontrada.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.whatsappAutomacaoAgendamento.updateMany({
        where: {
          id_empresa: sessao.id_empresa,
          id_whatsapp_automacao: automacao.id,
          status: "PENDENTE",
        },
        data: {
          status: "CANCELADO",
          erro_ultimo: "Automação excluída.",
        },
      });

      await tx.whatsappAutomacao.update({
        where: { id: automacao.id },
        data: {
          deleted_at: new Date(),
          ativo: false,
          job_status: STATUS_JOB.DELETED,
        },
      });
    });

    return ok({ ok: true });
  });
}
