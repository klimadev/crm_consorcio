import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────────────────

export type TipoAlerta =
  | "lead_parado"
  | "parcela_vencida"
  | "quente_parado"
  | "lead_novo_sem_toque";

export type GravidadeAlerta = "critica" | "alerta" | "info";

export type SmartAlert = {
  tipo: TipoAlerta;
  gravidade: GravidadeAlerta;
  titulo: string;
  mensagem: string;
  leadId: string;
  leadNome: string;
  valor?: number;
};

export type AnaliseResultado = {
  premium: boolean;
  alerts: SmartAlert[];
  metrics: {
    totalLeads: number;
    leadsParados: number;
    parcelasVencidas: number;
    // Nota: semResponsavel foi removido — Lead.id_funcionario e NOT NULL,
    // portanto nunca pode haver lead sem responsavel (a query antiga
    // `id_funcionario: null` era invalida no Prisma 5 e falhava em runtime).
    quentesParados: number;
    novosSemToque: number;
    potencialPerdido: number;
  };
};

// ── Constantes ─────────────────────────────────────────────────────────────

const DIAS_LEAD_PARADO = 7;
const DIAS_QUENTE_PARADO = 3;
const DIAS_NOVO_SEM_TOQUE = 2;

// ── Engine ─────────────────────────────────────────────────────────────────

export async function analisarLeads(idEmpresa: string): Promise<AnaliseResultado> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: idEmpresa },
    select: { premium_liberado: true },
  });

  if (!empresa?.premium_liberado) {
    const envFallback = process.env.PREMIUM_LIBERADO !== "false";
    if (!envFallback) {
      return { premium: false, alerts: [], metrics: emptyMetrics() };
    }
  }

  const estagiosFinalizados = await prisma.estagioFunil.findMany({
    where: { id_empresa: idEmpresa, tipo: { in: ["GANHO", "PERDIDO"] } },
    select: { id: true },
  });
  const idsFinais = new Set(estagiosFinalizados.map((e) => e.id));

  const leads = await prisma.lead.findMany({
    where: { id_empresa: idEmpresa },
    include: {
      estagio: { select: { ordem: true, nome: true } },
      parcelas: {
        where: { status: { notIn: ["PAGA", "CANCELADA", "ABORTADA"] } },
        select: { valor: true, data_vencimento: true, status: true },
      },
    },
  });

  const alerts: SmartAlert[] = [];
  const agora = new Date();
  let leadsParados = 0;
  let quentesParados = 0;
  let novosSemToque = 0;
  let potencialPerdido = 0;

  for (const lead of leads) {
    if (idsFinais.has(lead.id_estagio)) continue;

    const atualizadoEm = new Date(lead.atualizado_em);
    const criadoEm = new Date(lead.criado_em);
    const diffDias = diffDays(agora, atualizadoEm);

    // Lead parado
    if (diffDias >= DIAS_LEAD_PARADO) {
      leadsParados++;
      potencialPerdido += lead.valor_consorcio || 0;
      alerts.push({
        tipo: "lead_parado",
        gravidade: diffDias >= 14 ? "critica" : "alerta",
        titulo: "Lead parado",
        mensagem: `${lead.nome} está parado há ${diffDias} dias no estágio "${lead.estagio.nome}".`,
        leadId: lead.id,
        leadNome: lead.nome,
        valor: lead.valor_consorcio || undefined,
      });
    }

    // Quente parado
    if (lead.estagio.ordem >= 3 && diffDias >= DIAS_QUENTE_PARADO && diffDias < DIAS_LEAD_PARADO) {
      quentesParados++;
      alerts.push({
        tipo: "quente_parado",
        gravidade: "critica",
        titulo: "Lead quente parado",
        mensagem: `${lead.nome} está no estágio "${lead.estagio.nome}" e sem atividade há ${diffDias} dias. Pode estar esfriando!`,
        leadId: lead.id,
        leadNome: lead.nome,
        valor: lead.valor_consorcio || undefined,
      });
    }

    // Lead novo sem toque
    const diffCriacao = diffDays(agora, criadoEm);
    if (diffCriacao <= DIAS_NOVO_SEM_TOQUE && diffDias === 0) {
      novosSemToque++;
      alerts.push({
        tipo: "lead_novo_sem_toque",
        gravidade: "alerta",
        titulo: "Lead novo sem interação",
        mensagem: `${lead.nome} foi criado há ${diffCriacao} dia(s) e ainda não teve interação.`,
        leadId: lead.id,
        leadNome: lead.nome,
        valor: lead.valor_consorcio || undefined,
      });
    }

    // Parcelas vencidas
    const vencidas = lead.parcelas.filter((p) => {
      return new Date(p.data_vencimento) < agora;
    });

    if (vencidas.length > 0) {
      const totalVencido = vencidas.reduce((acc, p) => acc + p.valor, 0);
      alerts.push({
        tipo: "parcela_vencida",
        gravidade: "critica",
        titulo: "Parcela(s) vencida(s)",
        mensagem: `${lead.nome} tem ${vencidas.length} parcela(s) vencida(s), totalizando R$ ${totalVencido.toFixed(2)}.`,
        leadId: lead.id,
        leadNome: lead.nome,
        valor: totalVencido,
      });
    }
  }

  // Bloco "Leads sem responsavel" removido: Lead.id_funcionario e NOT NULL
  // (a query `id_funcionario: null` lancava "Argument must not be null").
  return {
    premium: true,
    alerts,
    metrics: {
      totalLeads: leads.length,
      leadsParados,
      parcelasVencidas: alerts.filter((a) => a.tipo === "parcela_vencida").length,
      // semResponsavel: removido (lead sempre tem responsavel — NOT NULL)
      quentesParados,
      novosSemToque,
      potencialPerdido,
    },
  };
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function emptyMetrics() {
  return {
    totalLeads: 0, leadsParados: 0, parcelasVencidas: 0, quentesParados: 0, novosSemToque: 0, potencialPerdido: 0,
  };
}
