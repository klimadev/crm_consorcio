import { prisma } from "@/lib/prisma";
import { DIAS_ESTAGIO_PARADO } from "@/lib/validacoes";

/**
 * Detecta automaticamente pendências nos leads de uma empresa.
 * Esta função deve ser chamada periodicamente (ex: via cron ou manualmente)
 * 
 * Regras:
 * 1. Lead FECHADO sem documento de aprovação
 * 2. Lead parado em um estágio (exceto GANHO e PERDIDO) por mais de X dias
 */
export async function detectarPendenciasAutomaticas(idEmpresa: string) {
  const hoje = new Date();
  const dataLimiteEstagioParado = new Date(hoje);
  dataLimiteEstagioParado.setDate(dataLimiteEstagioParado.getDate() - DIAS_ESTAGIO_PARADO);

  // Buscar todos os leads da empresa
  const leads = await prisma.lead.findMany({
    where: {
      id_empresa: idEmpresa,
    },
    include: {
      pendencias: true,
      estagio: true,
    },
  });

  const pendenciasDetectadas: string[] = [];

  for (const lead of leads) {
    const pendenciasAtuais = lead.pendencias.filter((p) => !p.resolvida);
    const tiposPendentes = pendenciasAtuais.map((p) => p.tipo);

    // Regra 1: Lead FECHADO sem documento de aprovação
    const isFechado = lead.estagio.tipo === "FECHADO";
    const hasDocumento = lead.documento_aprovacao_url;

    if (
      isFechado &&
      !hasDocumento &&
      !tiposPendentes.includes("DOCUMENTO_APROVACAO_PENDENTE")
    ) {
      await prisma.pendencia.create({
        data: {
          id_empresa: idEmpresa,
          id_lead: lead.id,
          tipo: "DOCUMENTO_APROVACAO_PENDENTE",
          descricao: "Deal fechado sem documento de aprovação. Anexe o documento para concluí-lo.",
        },
      });
      pendenciasDetectadas.push(`Lead ${lead.nome}: Fechado sem documento de aprovação`);
    }

    // Se o lead foi reaberto, resolver a pendência de documento automaticamente
    if (!isFechado && tiposPendentes.includes("DOCUMENTO_APROVACAO_PENDENTE")) {
      const pendencia = pendenciasAtuais.find(
        (p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE"
      );
      if (pendencia) {
        await prisma.pendencia.update({
          where: { id: pendencia.id },
          data: { resolvida: true },
        });
      }
    }

    // Regra 2: Lead parado em um estágio (exceto GANHO e PERDIDO) por mais de X dias
    const isGanhoOuPerdido = 
      lead.estagio.tipo === "GANHO" || lead.estagio.tipo === "PERDIDO";
    const isEstagioParado = lead.atualizado_em < dataLimiteEstagioParado;

    if (
      !isGanhoOuPerdido &&
      isEstagioParado &&
      !tiposPendentes.includes("ESTAGIO_PARADO")
    ) {
      await prisma.pendencia.create({
        data: {
          id_empresa: idEmpresa,
          id_lead: lead.id,
          tipo: "ESTAGIO_PARADO",
          descricao: `Lead parado no estágio "${lead.estagio.nome}" há mais de ${DIAS_ESTAGIO_PARADO} dias.`,
        },
      });
      pendenciasDetectadas.push(`Lead ${lead.nome}: Parado no estágio há mais de ${DIAS_ESTAGIO_PARADO} dias`);
    }

    // Se o lead saiu do estágio parado, resolver a pendência automaticamente
    if (!isEstagioParado && tiposPendentes.includes("ESTAGIO_PARADO")) {
      const pendencia = pendenciasAtuais.find(
        (p) => p.tipo === "ESTAGIO_PARADO"
      );
      if (pendencia) {
        await prisma.pendencia.update({
          where: { id: pendencia.id },
          data: { resolvida: true },
        });
      }
    }
  }

  return {
    totalProcessados: leads.length,
    pendenciasDetectadas,
  };
}

/**
 * Detecta pendências específicas para um lead individual
 * Usado quando um lead é criado ou atualizado
 */
export async function detectarPendenciasParaLead(idLead: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: idLead },
    include: {
      pendencias: true,
      estagio: true,
    },
  });

  if (!lead) {
    return { pendenciasCriadas: [] };
  }

  const hoje = new Date();
  const dataLimiteEstagioParado = new Date(hoje);
  dataLimiteEstagioParado.setDate(dataLimiteEstagioParado.getDate() - DIAS_ESTAGIO_PARADO);

  const pendenciasAtuais = lead.pendencias.filter((p) => !p.resolvida);
  const tiposPendentes = pendenciasAtuais.map((p) => p.tipo);
  const novasPendencias: string[] = [];

  // Regra 1: Lead FECHADO sem documento de aprovação
  const isFechado = lead.estagio.tipo === "FECHADO";
  const hasDocumento = lead.documento_aprovacao_url;

  if (
    isFechado &&
    !hasDocumento &&
    !tiposPendentes.includes("DOCUMENTO_APROVACAO_PENDENTE")
  ) {
    await prisma.pendencia.create({
      data: {
        id_empresa: lead.id_empresa,
        id_lead: lead.id,
        tipo: "DOCUMENTO_APROVACAO_PENDENTE",
        descricao: "Deal fechado sem documento de aprovação. Anexe o documento para concluí-lo.",
      },
    });
    novasPendencias.push("DOCUMENTO_APROVACAO_PENDENTE");
  }

  // Se o lead foi reaberto, resolver a pendência de documento automaticamente
  if (!isFechado && tiposPendentes.includes("DOCUMENTO_APROVACAO_PENDENTE")) {
    const pendencia = pendenciasAtuais.find(
      (p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE"
    );
    if (pendencia) {
      await prisma.pendencia.update({
        where: { id: pendencia.id },
        data: { resolvida: true },
      });
    }
  }

  // Regra 2: Lead parado em um estágio (exceto GANHO e PERDIDO) por mais de X dias
  const isGanhoOuPerdido = 
    lead.estagio.tipo === "GANHO" || lead.estagio.tipo === "PERDIDO";
  const isEstagioParado = lead.atualizado_em < dataLimiteEstagioParado;

  if (
    !isGanhoOuPerdido &&
    isEstagioParado &&
    !tiposPendentes.includes("ESTAGIO_PARADO")
  ) {
    await prisma.pendencia.create({
      data: {
        id_empresa: lead.id_empresa,
        id_lead: lead.id,
        tipo: "ESTAGIO_PARADO",
        descricao: `Lead parado no estágio "${lead.estagio.nome}" há mais de ${DIAS_ESTAGIO_PARADO} dias.`,
      },
    });
    novasPendencias.push("ESTAGIO_PARADO");
  }

  // Se o lead saiu do estágio parado, resolver a pendência automaticamente
  if (!isEstagioParado && tiposPendentes.includes("ESTAGIO_PARADO")) {
    const pendencia = pendenciasAtuais.find(
      (p) => p.tipo === "ESTAGIO_PARADO"
    );
    if (pendencia) {
      await prisma.pendencia.update({
        where: { id: pendencia.id },
        data: { resolvida: true },
      });
    }
  }

  return { pendenciasCriadas: novasPendencias };
}
