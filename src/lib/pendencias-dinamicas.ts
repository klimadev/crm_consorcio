import { prisma } from "@/lib/prisma";
import { DIAS_ESTAGIO_PARADO, LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";

export type PendenciaDinamica = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

function gerarIdPendencia(leadId: string, tipo: string): string {
  return `${leadId}:${tipo}`;
}

function calcularPendenciasLead(
  lead: { id: string; atualizado_em: Date; documento_aprovacao_url: string | null },
  estagio: { tipo: string; nome: string }
): PendenciaDinamica[] {
  const pendencias: PendenciaDinamica[] = [];
  const hoje = new Date();
  const dataLimiteEstagioParado = new Date(hoje);
  dataLimiteEstagioParado.setDate(dataLimiteEstagioParado.getDate() - DIAS_ESTAGIO_PARADO);

  const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
  const isGanhoOuPerdido = estagio.tipo === "GANHO" || estagio.tipo === "PERDIDO";
  const isEstagioParado = lead.atualizado_em < dataLimiteEstagioParado;
  const hasDocumento = !!lead.documento_aprovacao_url;

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

export async function detectarPendenciasDinamicas(
  idEmpresa: string,
  idFuncionario?: string
): Promise<PendenciaDinamica[]> {
  const whereLead: { id_empresa: string; id_funcionario?: string } = { id_empresa: idEmpresa };
  if (idFuncionario) {
    whereLead.id_funcionario = idFuncionario;
  }

  const leads = await prisma.lead.findMany({
    where: whereLead,
    select: {
      id: true,
      atualizado_em: true,
      documento_aprovacao_url: true,
      estagio: {
        select: {
          tipo: true,
          nome: true,
        },
      },
    },
  });

  const pendencias: PendenciaDinamica[] = [];
  for (const lead of leads) {
    const p = calcularPendenciasLead(lead, lead.estagio);
    pendencias.push(...p);
  }

  return pendencias;
}

export async function detectarPendenciasDinamicasLead(idLead: string): Promise<PendenciaDinamica[]> {
  const lead = await prisma.lead.findUnique({
    where: { id: idLead },
    select: {
      id: true,
      atualizado_em: true,
      documento_aprovacao_url: true,
      estagio: {
        select: {
          tipo: true,
          nome: true,
        },
      },
    },
  });

  if (!lead) return [];

  return calcularPendenciasLead(lead, lead.estagio);
}

export async function getLeadsComPendencias(
  idEmpresa: string,
  idFuncionario?: string
): Promise<Record<string, { total: number; naoResolvidas: number }>> {
  const pendencias = await detectarPendenciasDinamicas(idEmpresa, idFuncionario);

  const mapa: Record<string, { total: number; naoResolvidas: number }> = {};
  for (const pendencia of pendencias) {
    if (!mapa[pendencia.id_lead]) {
      mapa[pendencia.id_lead] = { total: 0, naoResolvidas: 0 };
    }
    mapa[pendencia.id_lead].total++;
    if (!pendencia.resolvida) {
      mapa[pendencia.id_lead].naoResolvidas++;
    }
  }

  return mapa;
}
