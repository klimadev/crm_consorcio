import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";

export async function GET(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) {
    return auth.erro;
  }

  const searchParams = request.nextUrl.searchParams;
  const incluirLista = searchParams.get("lista") === "true";
  const limite = Math.min(parseInt(searchParams.get("limite") || "50"), 100);

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const db = prisma as unknown as {
    whatsappAutomacaoAgendamento: {
      count: (args: {
        where: {
          id_empresa: string;
          status: string;
          enviado_em?: { gte: Date };
        };
      }) => Promise<number>;
      findMany: (args: {
        where: {
          id_empresa: string;
          status?: string;
        };
        orderBy: { agendado_para: "asc" };
        take: number;
        select: {
          id: true;
          id_lead: true;
          id_etapa: true;
          id_estagio_trigger: true;
          mensagem_template: true;
          contexto_json: true;
          agendado_para: true;
          status: true;
          tentativas: true;
          erro_ultimo: true;
          enviado_em: true;
          criado_em: true;
        };
      }) => Promise<Array<{
        id: string;
        id_lead: string;
        id_etapa: string;
        id_estagio_trigger: string | null;
        mensagem_template: string;
        contexto_json: string;
        agendado_para: Date;
        status: string;
        tentativas: number;
        erro_ultimo: string | null;
        enviado_em: Date | null;
        criado_em: Date;
      }>>;
    };
  };

  const [pendentes, processando, falhas, enviadosHoje] = await Promise.all([
    db.whatsappAutomacaoAgendamento.count({
      where: {
        id_empresa: auth.sessao.id_empresa,
        status: "PENDENTE",
      },
    }),
    db.whatsappAutomacaoAgendamento.count({
      where: {
        id_empresa: auth.sessao.id_empresa,
        status: "PROCESSANDO",
      },
    }),
    db.whatsappAutomacaoAgendamento.count({
      where: {
        id_empresa: auth.sessao.id_empresa,
        status: "FALHA",
      },
    }),
    db.whatsappAutomacaoAgendamento.count({
      where: {
        id_empresa: auth.sessao.id_empresa,
        status: "ENVIADO",
        enviado_em: {
          gte: inicioDoDia,
        },
      },
    }),
  ]);

  const response: Record<string, unknown> = {
    resumo: {
      pendentes,
      processando,
      falhas,
      enviadosHoje,
      atualizadoEm: new Date().toISOString(),
    },
  };

  if (incluirLista) {
    const agendamentos = await db.whatsappAutomacaoAgendamento.findMany({
      where: {
        id_empresa: auth.sessao.id_empresa,
        status: { in: ["PENDENTE", "PROCESSANDO", "FALHA", "ENVIADO", "CANCELADO"] } as unknown as string,
      },
      orderBy: { agendado_para: "asc" },
      take: limite,
      select: {
        id: true,
        id_lead: true,
        id_etapa: true,
        id_estagio_trigger: true,
        mensagem_template: true,
        contexto_json: true,
        agendado_para: true,
        status: true,
        tentativas: true,
        erro_ultimo: true,
        enviado_em: true,
        criado_em: true,
      },
    });

    response.agendamentos = agendamentos.map((a) => ({
      ...a,
      agendado_para: a.agendado_para.toISOString(),
      criado_em: a.criado_em.toISOString(),
      enviado_em: a.enviado_em?.toISOString() ?? null,
    }));
  }

  return NextResponse.json(response);
}
