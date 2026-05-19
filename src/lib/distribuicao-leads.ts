import { prisma } from "@/lib/prisma";

export type ColaboradorInfo = {
  id: string;
  nome: string;
};

export type CargaLeadPorColaborador = Map<string, number>;

export async function obterCargaAtualColaboradores(
  idEmpresa: string,
  idsColaboradores: string[],
): Promise<CargaLeadPorColaborador> {
  const contagens = await prisma.lead.groupBy({
    by: ["id_funcionario"],
    where: {
      id_empresa: idEmpresa,
      id_funcionario: { in: idsColaboradores },
      estagio: {
        tipo: { notIn: ["GANHO", "PERDIDO"] },
      },
    },
    _count: { id: true },
  });

  const mapa = new Map<string, number>();
  for (const item of contagens) {
    mapa.set(item.id_funcionario, item._count.id);
  }
  return mapa;
}

export function escolherMenosCarregado(
  colaboradores: ColaboradorInfo[],
  carga: CargaLeadPorColaborador,
): ColaboradorInfo | null {
  if (!colaboradores.length) return null;

  let melhor = colaboradores[0];
  let menorCarga = carga.get(melhor.id) ?? 0;

  for (let i = 1; i < colaboradores.length; i++) {
    const atual = colaboradores[i];
    const cargaAtual = carga.get(atual.id) ?? 0;

    if (cargaAtual < menorCarga) {
      melhor = atual;
      menorCarga = cargaAtual;
    } else if (cargaAtual === menorCarga) {
      if (atual.nome < melhor.nome) {
        melhor = atual;
      } else if (atual.nome === melhor.nome && atual.id < melhor.id) {
        melhor = atual;
      }
    }
  }

  return melhor;
}

export function proximoColaboradorRoundRobin(
  colaboradores: ColaboradorInfo[],
  indiceAtual: number,
): { colaborador: ColaboradorInfo; proximoIndice: number } {
  const idx = indiceAtual % colaboradores.length;
  return {
    colaborador: colaboradores[idx],
    proximoIndice: indiceAtual + 1,
  };
}

export async function obterIndicesRoundRobin(idsPdvs: string[]): Promise<Map<string, number>> {
  const pdvs = await prisma.pdv.findMany({
    where: { id: { in: idsPdvs } },
    select: { id: true, round_robin_indice: true },
  });
  const mapa = new Map<string, number>();
  for (const p of pdvs) {
    mapa.set(p.id, p.round_robin_indice);
  }
  return mapa;
}

export async function salvarIndiceRoundRobin(idPdv: string, indice: number): Promise<void> {
  await prisma.pdv.update({ where: { id: idPdv }, data: { round_robin_indice: indice } });
}

export async function salvarIndicesRoundRobin(indices: Map<string, number>): Promise<void> {
  for (const [id, indice] of indices.entries()) {
    await salvarIndiceRoundRobin(id, indice);
  }
}
