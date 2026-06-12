import type { Meta, ProgressoMeta, RankingItem, RitmoStatus } from "@/modules/metas/types";
import { calcularDiasRestantes, obterCompetenciaISO } from "@/modules/metas/lib/dates";

/**
 * Calcula o percentual de forma segura (não quebra com alvo = 0).
 */
export function percentualSeguro(realizado: number, alvo: number): number {
  if (alvo <= 0) return 0;
  return Number(((realizado / alvo) * 100).toFixed(1));
}

/**
 * Obtém o status de ritmo baseado no percentual.
 * 🟢 No ritmo (≥80%), 🟡 Atenção (≥45%), 🔴 Fora (<45%)
 */
export function obterStatusPorPercentual(percentual: number): RitmoStatus {
  if (percentual >= 80) return "no_ritmo";
  if (percentual >= 45) return "atencao";
  return "fora";
}

/**
 * Calcula o progresso de UMA meta com base nos dados de pagamentos/leads.
 * Função pura: sem I/O, sem efeitos colaterais.
 *
 * @param meta - Dados da meta (alvo, tipo, origem, data_fim)
 * @param pagamentos - Array de valores de pagamentos recebidos no período
 * @param leadsFechados - Array de leads fechados no período (com valor)
 */
export function calcularProgresso(
  meta: Pick<Meta, "alvo" | "tipo_meta" | "origem" | "data_fim">,
  pagamentos?: { valor: number }[],
  leadsFechados?: { valor_consorcio?: number }[],
): ProgressoMeta {
  let realizado = 0;

  if (meta.origem === "PAGAMENTOS") {
    realizado = pagamentos?.reduce((acc, p) => acc + p.valor, 0) ?? 0;
  } else if (meta.tipo_meta === "VALOR") {
    realizado = leadsFechados?.reduce((acc, l) => acc + (l.valor_consorcio ?? 0), 0) ?? 0;
  } else {
    // VOLUME
    realizado = leadsFechados?.length ?? 0;
  }

  const percentual = percentualSeguro(realizado, meta.alvo);

  return {
    id_meta: "id_meta" in meta ? (meta as any).id : "",
    realizado,
    percentual,
    faltante: Math.max(0, Number((meta.alvo - realizado).toFixed(2))),
    dias_restantes: calcularDiasRestantes(new Date(meta.data_fim)),
    status: obterStatusPorPercentual(percentual),
  };
}

/**
 * Calcula o ranking de equipes: agrupa por equipe, calcula média de percentuais.
 * 1 PDV = 1 linha no ranking. Corrige o bug de duplicação.
 *
 * @param metasComProgresso - Array de metas com progresso já calculado
 * @returns Lista de ranking ordenada (maior percentual primeiro)
 */
export function calcularRanking(
  metasComProgresso: Array<Meta & { progresso: ProgressoMeta }>,
): RankingItem[] {
  // Agrupa por equipe
  const porEquipe = new Map<string, { nome: string; percentuais: number[]; realizados: number; alvos: number }>();

  for (const meta of metasComProgresso) {
    if (!meta.progresso) continue;
    const id = meta.id_equipe;
    const nome = meta.equipe?.nome ?? "Equipe";
    if (!porEquipe.has(id)) {
      porEquipe.set(id, { nome, percentuais: [], realizados: 0, alvos: 0 });
    }
    const grupo = porEquipe.get(id)!;
    grupo.percentuais.push(meta.progresso.percentual);
    grupo.realizados += meta.progresso.realizado;
    grupo.alvos += meta.alvo;
  }

  // Calcula média e monta ranking
  const ranking = Array.from(porEquipe.entries())
    .map(([id_equipe, grupo]) => {
      const media =
        grupo.percentuais.length > 0
          ? Number((grupo.percentuais.reduce((a, b) => a + b, 0) / grupo.percentuais.length).toFixed(1))
          : 0;
      return {
        posicao: 0,
        id_equipe,
        nome: grupo.nome,
        percentual: media,
        realizado: grupo.realizados,
        alvo: grupo.alvos,
        faltante: Math.max(0, Number((grupo.alvos - grupo.realizados).toFixed(2))),
      } as RankingItem;
    })
    .sort((a, b) => b.percentual - a.percentual || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((item, index) => ({ ...item, posicao: index + 1 }));

  return ranking;
}

/**
 * Agrega o progresso de todas as metas de uma equipe em um resumo.
 */
export function agregarProgressoEquipe(
  metas: Array<Meta & { progresso?: ProgressoMeta | null }>,
): { media_percentual: number; total_metas: number; no_ritmo: number; atencao: number; fora: number } {
  let somaPercentual = 0;
  let totalComProgresso = 0;
  let noRitmo = 0;
  let atencao = 0;
  let fora = 0;

  for (const meta of metas) {
    if (!meta.progresso) continue;
    somaPercentual += meta.progresso.percentual;
    totalComProgresso++;
    if (meta.progresso.status === "no_ritmo") noRitmo++;
    else if (meta.progresso.status === "atencao") atencao++;
    else fora++;
  }

  return {
    media_percentual: totalComProgresso > 0 ? Number((somaPercentual / totalComProgresso).toFixed(1)) : 0,
    total_metas: totalComProgresso,
    no_ritmo: noRitmo,
    atencao,
    fora,
  };
}
