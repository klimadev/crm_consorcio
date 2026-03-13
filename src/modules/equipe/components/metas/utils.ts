import { formataMoeda } from "@/lib/utils";
import type { MetaModuleItem } from "@/modules/equipe/types/metas";

export function formatarIndicadorMeta(meta: Pick<MetaModuleItem, "tipo_meta">, valor: number) {
  if (meta.tipo_meta === "VALOR") {
    return formataMoeda(valor);
  }

  const quantidade = Number.isInteger(valor) ? valor : Number(valor.toFixed(1));
  return `${quantidade} contratos`;
}

export function formatarPeriodoMeta(meta: Pick<MetaModuleItem, "data_inicio" | "data_fim">) {
  const inicio = new Date(meta.data_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const fim = new Date(meta.data_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${inicio} ate ${fim}`;
}

export function descreverIndicadorMeta(meta: Pick<MetaModuleItem, "tipo_meta">) {
  return meta.tipo_meta === "VALOR" ? "Valor recebido" : "Contratos com pagamento";
}

export function statusMeta(percentual: number) {
  if (percentual >= 100) {
    return { label: "Meta batida", emoji: "🏆", variant: "success" as const };
  }

  if (percentual >= 80) {
    return { label: "Em chamas", emoji: "🔥", variant: "warning" as const };
  }

  if (percentual >= 60) {
    return { label: "No caminho", emoji: "🎯", variant: "info" as const };
  }

  if (percentual >= 40) {
    return { label: "Quase la", emoji: "⚡", variant: "warning" as const };
  }

  return { label: "Forca!", emoji: "💪", variant: "default" as const };
}
