import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPerfis } from "@/lib/api/route-guards";
import { parseJson, validateBody } from "@/lib/api/route-validation";
import { ok, badRequest } from "@/lib/api/http";
import { esquemaCriarAutomacaoWhatsapp, STATUS_AUTOMACAO, STATUS_JOB } from "@/lib/validacoes";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";

export async function GET(request: NextRequest) {
  return withPerfis(request, ["EMPRESA", "GERENTE", "COLABORADOR"], async ({ sessao }) => {
    const automacoes = await prisma.whatsappAutomacao.findMany({
      where: { 
        id_empresa: sessao.id_empresa,
        deleted_at: null,
      },
      include: {
        etapas: {
          orderBy: { ordem: "asc" },
        },
      },
      orderBy: { criado_em: "desc" },
    });

    return ok({ automacoes });
  });
}

export async function POST(request: NextRequest) {
  return withPerfis(request, ["EMPRESA"], async ({ sessao }) => {
    const parseResult = await parseJson(request);
    if (!parseResult.ok) return parseResult.response;

    const validacao = validateBody(esquemaCriarAutomacaoWhatsapp, parseResult.data);
    if (!validacao.ok) return validacao.response;

    const dados = validacao.data;
    const instancia = await prisma.whatsappInstancia.findFirst({
      where: {
        id: dados.id_whatsapp_instancia,
        id_empresa: sessao.id_empresa,
      },
    });

    if (!instancia) {
      return badRequest("Instancia de WhatsApp invalida.");
    }

    if (dados.id_estagio_destino) {
      const estagio = await prisma.estagioFunil.findFirst({
        where: {
          id: dados.id_estagio_destino,
          id_empresa: sessao.id_empresa,
        },
      });

      if (!estagio) {
        return badRequest("Estagio destino invalido.");
      }
    }

    let horarioRaw: string | null = null;
    let horarioNormalizado: string | null = null;
    let delayMinutos: number | null = null;
    let statusAutomacao: "ATIVA" | "INATIVA" | "ERRO_CONFIG" | "ERRO_JOB" = STATUS_AUTOMACAO.ATIVA;
    const jobStatus: "SCHEDULED" | "NOT_SCHEDULED" | "DELETED" | "FAILED" = STATUS_JOB.NOT_SCHEDULED;

    if (dados.horario_texto && dados.horario_texto.trim().length > 0) {
      const resultadoHorario = parseHorarioTexto(dados.horario_texto);
      if (resultadoHorario.ok) {
        horarioRaw = resultadoHorario.raw;
        horarioNormalizado = resultadoHorario.normalized;
        delayMinutos = resultadoHorario.delay_minutos;
      } else {
        statusAutomacao = "ERRO_CONFIG";
      }
    }

    const automacao = await prisma.$transaction(async (tx) => {
      const criada = await tx.whatsappAutomacao.create({
        data: {
          id_empresa: sessao.id_empresa,
          id_whatsapp_instancia: dados.id_whatsapp_instancia,
          evento: dados.evento,
          id_estagio_destino: dados.id_estagio_destino?.trim() || null,
          tipo_destino: dados.tipo_destino,
          telefone_destino: dados.tipo_destino === "FIXO" ? dados.telefone_destino?.trim() : null,
          mensagem: dados.evento === "LEAD_STAGE_CHANGED" ? dados.mensagem?.trim() ?? null : null,
          ativo: dados.ativo ?? true,
          horario_raw: horarioRaw,
          horario_normalizado: horarioNormalizado,
          delay_minutos: delayMinutos,
          timezone: "America/Sao_Paulo",
          status: statusAutomacao,
          job_status: jobStatus,
        },
      });

      if (dados.evento === "LEAD_FOLLOW_UP" && dados.etapas?.length) {
        await tx.whatsappAutomacaoEtapa.createMany({
          data: dados.etapas.map((etapa) => ({
            id_empresa: sessao.id_empresa,
            id_whatsapp_automacao: criada.id,
            ordem: etapa.ordem,
            delay_minutos: etapa.delay_minutos,
            mensagem_template: etapa.mensagem_template,
          })),
        });
      }

      return tx.whatsappAutomacao.findFirstOrThrow({
        where: { id: criada.id },
        include: {
          etapas: {
            orderBy: { ordem: "asc" },
          },
        },
      });
    });

    return ok({ automacao }, 201);
  });
}
