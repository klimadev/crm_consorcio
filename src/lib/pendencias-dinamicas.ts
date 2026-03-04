import { prisma } from "@/lib/prisma";
import { TipoPendencia } from "@/lib/validacoes";
import { calcularPendenciasLead } from "@/lib/calculo-pendencias";

export type PendenciaDinamica = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

export async function detectarPendenciasDinamicas(
  idEmpresa: string,
  idFuncionario?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whereAdicional?: any
): Promise<PendenciaDinamica[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereLead: any = { id_empresa: idEmpresa };
  
  if (idFuncionario) {
    whereLead.id_funcionario = idFuncionario;
  }
  
  if (whereAdicional?.id_funcionario) {
    whereLead.id_funcionario = whereAdicional.id_funcionario;
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
