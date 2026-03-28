import { DIAS_ESTAGIO_PARADO, LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";

export type PendenciaCalculada = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

export type LeadParaCalculo = {
  id: string;
  atualizado_em: Date | string;
  documento_aprovacao_url: string | null;
  aprovado_em: Date | string | null;
  quantidade_parcelas?: number;
};

export type EstagioParaCalculo = {
  tipo: string;
  nome: string;
};

function gerarIdPendencia(leadId: string, tipo: string): string {
  return `${leadId}:${tipo}`;
}

export function calcularPendenciasLead(
  lead: LeadParaCalculo,
  estagio: EstagioParaCalculo
): PendenciaCalculada[] {
  const pendencias: PendenciaCalculada[] = [];
  const hoje = new Date();
  const dataLimiteEstagioParado = new Date(hoje);
  dataLimiteEstagioParado.setDate(dataLimiteEstagioParado.getDate() - DIAS_ESTAGIO_PARADO);

  const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
  const isPreAprovacao = estagio.nome === "Pré Aprovação";
  const isGanhoOuPerdido = estagio.tipo === "GANHO" || estagio.tipo === "PERDIDO";
  const hasDocumento = !!lead.documento_aprovacao_url;
  const isEstagioParado = new Date(lead.atualizado_em || Date.now()) < dataLimiteEstagioParado;

  if ((isFechadoOuGanho || isPreAprovacao) && !hasDocumento) {
    pendencias.push({
      id: gerarIdPendencia(lead.id, "DOCUMENTO_APROVACAO_PENDENTE"),
      id_lead: lead.id,
      tipo: "DOCUMENTO_APROVACAO_PENDENTE",
      descricao: LABELS_PENDENCIA.DOCUMENTO_APROVACAO_PENDENTE,
      resolvida: false,
    });
  }

  if (isPreAprovacao && hasDocumento && !lead.aprovado_em) {
    pendencias.push({
      id: gerarIdPendencia(lead.id, "APROVACAO_GERENCIA_PENDENTE"),
      id_lead: lead.id,
      tipo: "APROVACAO_GERENCIA_PENDENTE",
      descricao: LABELS_PENDENCIA.APROVACAO_GERENCIA_PENDENTE,
      resolvida: false,
    });
  }

  if (!isGanhoOuPerdido && isEstagioParado) {
    pendencias.push({
      id: gerarIdPendencia(lead.id, "ESTAGIO_PARADO"),
      id_lead: lead.id,
      tipo: "ESTAGIO_PARADO",
      descricao: `Lead parado no estágio "${estagio.nome}" há mais de ${DIAS_ESTAGIO_PARADO} dias.`,
      resolvida: false,
    });
  }

  // Pendência: Lead GANHO/FECHADO sem plano de pagamento (parcelas)
  if (isFechadoOuGanho && (!lead.quantidade_parcelas || lead.quantidade_parcelas === 0)) {
    pendencias.push({
      id: gerarIdPendencia(lead.id, "PLANO_PAGAMENTO_PENDENTE"),
      id_lead: lead.id,
      tipo: "PLANO_PAGAMENTO_PENDENTE",
      descricao: "Lead fechado sem plano de pagamento. Gere as parcelas para iniciar o recebimento.",
      resolvida: false,
    });
  }

  return pendencias;
}
