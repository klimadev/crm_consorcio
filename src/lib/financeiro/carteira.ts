import type { ClienteCarteira } from "@/lib/api/recebimentos";

// Grupo agregado por lead vindo do Prisma groupBy. Cada query pede só as
// agregações de que precisa, então os campos ausentes chegam indefinidos.
export type GrupoCarteira = {
  id_lead: string;
  _count: { _all: number };
  _sum?: { valor: number | null };
  _min?: { data_vencimento: Date | null };
  _max?: { data_pagamento?: Date | null; quantidade_total?: number | null };
};

// Monta a carteira a partir dos agregados por lead. Regras de produto:
// - quem tem parcela em atraso vem primeiro, ordenado por valor em risco;
// - cliente em dia ordena pelo próximo vencimento (mais urgente primeiro);
// - cliente só com pagamento no período fica por último, do mais recente.
// Função pura: sem I/O, sem relógio, determinística para teste.
export function montarCarteira(params: {
  leads: Array<{ id: string; nome: string; telefone: string }>;
  grupoAtraso: GrupoCarteira[];
  grupoAguardando: GrupoCarteira[];
  grupoPagasPeriodo: GrupoCarteira[];
  pagasGlobais: Record<string, number>;
}): ClienteCarteira[] {
  const leadPorId = new Map(params.leads.map((lead) => [lead.id, lead]));
  const clientes = new Map<string, ClienteCarteira>();

  const garantir = (idLead: string): ClienteCarteira => {
    const existente = clientes.get(idLead);
    if (existente) return existente;

    const lead = leadPorId.get(idLead);
    const cliente: ClienteCarteira = {
      id_lead: idLead,
      nome: lead?.nome ?? "Cliente",
      telefone: lead?.telefone ?? "",
      estado: "em_dia",
      valorEmRisco: 0,
      quantidadeAtrasadas: 0,
      quantidadePendentes: 0,
      valorPendente: 0,
      proximoVencimento: null,
      primeiroAtraso: null,
      ultimoPagamento: null,
      pagasPlano: params.pagasGlobais[idLead] ?? 0,
      totalPlano: 0,
    };
    clientes.set(idLead, cliente);
    return cliente;
  };

  for (const grupo of params.grupoAtraso) {
    const cliente = garantir(grupo.id_lead);
    cliente.quantidadeAtrasadas = grupo._count._all;
    cliente.valorEmRisco = grupo._sum?.valor ?? 0;
    cliente.primeiroAtraso = grupo._min?.data_vencimento?.toISOString() ?? null;
    cliente.estado = "em_atraso";
    cliente.totalPlano = Math.max(cliente.totalPlano, grupo._max?.quantidade_total ?? 0);
  }

  for (const grupo of params.grupoAguardando) {
    const cliente = garantir(grupo.id_lead);
    cliente.quantidadePendentes = grupo._count._all;
    cliente.valorPendente = grupo._sum?.valor ?? 0;
    cliente.proximoVencimento = grupo._min?.data_vencimento?.toISOString() ?? null;
    cliente.totalPlano = Math.max(cliente.totalPlano, grupo._max?.quantidade_total ?? 0);
  }

  for (const grupo of params.grupoPagasPeriodo) {
    const cliente = garantir(grupo.id_lead);
    cliente.ultimoPagamento = grupo._max?.data_pagamento?.toISOString() ?? null;
    cliente.totalPlano = Math.max(cliente.totalPlano, grupo._max?.quantidade_total ?? 0);
  }

  for (const cliente of clientes.values()) {
    if (cliente.estado !== "em_atraso") {
      cliente.estado = cliente.quantidadePendentes > 0 ? "em_dia" : "pago_no_periodo";
    }
  }

  const ordemEstado = { em_atraso: 0, em_dia: 1, pago_no_periodo: 2 } as const;
  return Array.from(clientes.values()).sort((a, b) => {
    const porEstado = ordemEstado[a.estado] - ordemEstado[b.estado];
    if (porEstado !== 0) return porEstado;

    if (a.estado === "em_atraso") return b.valorEmRisco - a.valorEmRisco;
    if (a.estado === "em_dia") return (a.proximoVencimento ?? "").localeCompare(b.proximoVencimento ?? "");
    return (b.ultimoPagamento ?? "").localeCompare(a.ultimoPagamento ?? "");
  });
}
