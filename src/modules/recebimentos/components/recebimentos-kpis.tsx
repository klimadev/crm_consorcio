import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecebimentosKpi } from "../types";

type RecebimentosKpisProps = {
  itens: RecebimentosKpi[];
  carregando: boolean;
};

const COR_POR_TOM: Record<RecebimentosKpi["tom"], string> = {
  emerald: "text-success",
  blue: "text-info",
  rose: "text-destructive",
  amber: "text-warning",
};

// Indicador com hierarquia de verdade: rótulo pequeno, número grande em cor
// semântica, contexto humano embaixo. Sem gradiente decorativo.
export function RecebimentosKpis({ itens, carregando }: RecebimentosKpisProps) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((indice) => (
          <div key={indice} className="h-28 rounded-2xl border border-border bg-background-elevated animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {itens.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border bg-background-surface p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">{item.rotulo}</p>
          <p className={cn("mt-2 text-2xl font-bold tracking-tight", COR_POR_TOM[item.tom])}>{item.valor}</p>
          <p className="mt-1 text-xs text-foreground-muted">{item.apoio}</p>
          {item.tendencia ? (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-semibold",
                item.tendenciaPositiva ? "text-success" : "text-destructive",
              )}
            >
              {item.tendenciaPositiva ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {item.tendencia}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
