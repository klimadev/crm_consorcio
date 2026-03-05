import { prisma } from "@/lib/prisma";

export const ESTAGIOS_FIXOS_PADRAO = [
  { nome: "Indefinido", tipo: "ABERTO", ordem: 1 },
  { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
  { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
  { nome: "Pré Aprovação", tipo: "ABERTO", ordem: 4 },
  { nome: "Fechado", tipo: "GANHO", ordem: 5 },
  { nome: "Pós Vendas", tipo: "GANHO", ordem: 6 },
  { nome: "Perdido", tipo: "PERDIDO", ordem: 7 },
] as const;

export async function garantirEstagiosFixosEmpresa(idEmpresa: string) {
  await prisma.$transaction(async (tx) => {
    const existentes = await tx.estagioFunil.findMany({
      where: { id_empresa: idEmpresa },
      orderBy: { ordem: "asc" },
    });

    const mapaPorNome = new Map(existentes.map((estagio) => [estagio.nome, estagio]));

    for (const existente of existentes) {
      await tx.estagioFunil.update({
        where: { id: existente.id },
        data: { ordem: existente.ordem + 1000 },
      });
    }

    for (const estagioFixo of ESTAGIOS_FIXOS_PADRAO) {
      const existente = mapaPorNome.get(estagioFixo.nome);
      if (existente) {
        await tx.estagioFunil.update({
          where: { id: existente.id },
          data: {
            nome: estagioFixo.nome,
            tipo: estagioFixo.tipo,
            ordem: estagioFixo.ordem,
          },
        });
        continue;
      }

      await tx.estagioFunil.create({
        data: {
          id_empresa: idEmpresa,
          nome: estagioFixo.nome,
          tipo: estagioFixo.tipo,
          ordem: estagioFixo.ordem,
        },
      });
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
