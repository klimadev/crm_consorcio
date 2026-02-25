import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao, podeGerenciarEmpresa, respostaSemPermissao } from "@/lib/permissoes";
import { esquemaCriarAutomacaoWhatsapp, mensagemErroValidacao, STATUS_AUTOMACAO, STATUS_JOB } from "@/lib/validacoes";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  // Por padrão, excluir automações deletadas (soft delete)
  const automacoes = await prisma.whatsappAutomacao.findMany({
    where: { 
      id_empresa: auth.sessao.id_empresa,
      deleted_at: null,
    },
    include: {
      etapas: {
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { criado_em: "desc" },
  });

  return NextResponse.json({ automacoes });
}

export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  if (!podeGerenciarEmpresa(auth.sessao)) {
    return respostaSemPermissao();
  }

  const body = (await request.json()) as {
    id_whatsapp_instancia?: string;
    evento?: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
    id_estagio_destino?: string;
    telefone_destino?: string;
    tipo_destino?: "FIXO" | "LEAD_TELEFONE";
    mensagem?: string;
    horario_texto?: string;
    etapas?: Array<{
      ordem: number;
      delay_minutos: number;
      mensagem_template: string;
    }>;
    ativo?: boolean;
  };

  const validacao = esquemaCriarAutomacaoWhatsapp.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const dados = validacao.data;
  const instancia = await prisma.whatsappInstancia.findFirst({
    where: {
      id: dados.id_whatsapp_instancia,
      id_empresa: auth.sessao.id_empresa,
    },
  });

  if (!instancia) {
    return NextResponse.json({ erro: "Instancia de WhatsApp invalida." }, { status: 400 });
  }

  if (dados.id_estagio_destino) {
    const estagio = await prisma.estagioFunil.findFirst({
      where: {
        id: dados.id_estagio_destino,
        id_empresa: auth.sessao.id_empresa,
      },
    });

    if (!estagio) {
      return NextResponse.json({ erro: "Estagio destino invalido." }, { status: 400 });
    }
  }

  // Processar horário textual (delay após trigger)
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
      // Se horário inválido, marcar como erro de configuração
      statusAutomacao = "ERRO_CONFIG";
    }
  }

  const automacao = await prisma.$transaction(async (tx) => {
    const criada = await tx.whatsappAutomacao.create({
      data: {
        id_empresa: auth.sessao.id_empresa,
        id_whatsapp_instancia: dados.id_whatsapp_instancia,
        evento: dados.evento,
        id_estagio_destino: dados.id_estagio_destino?.trim() || null,
        tipo_destino: dados.tipo_destino,
        telefone_destino: dados.tipo_destino === "FIXO" ? dados.telefone_destino?.trim() : null,
        mensagem: dados.evento === "LEAD_STAGE_CHANGED" ? dados.mensagem?.trim() ?? null : null,
        ativo: dados.ativo ?? true,
        // Novos campos
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
          id_empresa: auth.sessao.id_empresa,
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

  return NextResponse.json({ automacao }, { status: 201 });
}
