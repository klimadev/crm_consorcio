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
  const isGanhoOuPerdido = estagio.tipo === "GANHO" || estagio.tipo === "PERDIDO";
  const hasDocumento = !!lead.documento_aprovacao_url;
  const isEstagioParado = new Date(lead.atualizado_em || Date.now()) < dataLimiteEstagioParado;

  if (isFechadoOuGanho && !hasDocumento) {
    pendencias.push({
      id: gerarIdPendencia(lead.id, "DOCUMENTO_APROVACAO_PENDENTE"),
      id_lead: lead.id,
      tipo: "DOCUMENTO_APROVACAO_PENDENTE",
      descricao: LABELS_PENDENCIA.DOCUMENTO_APROVACAO_PENDENTE,
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

  return pendencias;
}
