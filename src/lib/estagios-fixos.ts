import { prisma } from "@/lib/prisma";

export const ESTAGIOS_FIXOS_PADRAO = [
  { nome: "Indefinido", tipo: "ABERTO", ordem: 1 },
  { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
  { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
  { nome: "Fechado", tipo: "GANHO", ordem: 4 },
  { nome: "Perdido", tipo: "PERDIDO", ordem: 5 },
] as const;

export async function garantirEstagiosFixosEmpresa(idEmpresa: string) {
  await prisma.$transaction(async (tx) => {
    for (const estagioFixo of ESTAGIOS_FIXOS_PADRAO) {
      const existente = await tx.estagioFunil.findFirst({
        where: {
          id_empresa: idEmpresa,
          OR: [{ ordem: estagioFixo.ordem }, { nome: estagioFixo.nome }],
        },
      });

      if (existente) {
        await tx.estagioFunil.update({
          where: { id: existente.id },
          data: {
            nome: estagioFixo.nome,
            tipo: estagioFixo.tipo,
            ordem: estagioFixo.ordem,
          },
        });
      } else {
        await tx.estagioFunil.create({
          data: {
            id_empresa: idEmpresa,
            nome: estagioFixo.nome,
            tipo: estagioFixo.tipo,
            ordem: estagioFixo.ordem,
          },
        });
      }
    }
  });

  return prisma.estagioFunil.findMany({
    where: { id_empresa: idEmpresa },
    orderBy: { ordem: "asc" },
  });
}

export async function obterEstagioIndefinido(idEmpresa: string) {
  await garantirEstagiosFixosEmpresa(idEmpresa);
  const estagio = await prisma.estagioFunil.findFirst({
    where: { id_empresa: idEmpresa, nome: "Indefinido", ordem: 1 },
  });

  if (!estagio) {
    throw new Error("Estagio fixo 'Indefinido' nao encontrado.");
  }

  return estagio;
}
