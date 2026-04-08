import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { RecebimentosKpi } from "../types";

const icones: Record<RecebimentosKpi["tom"], ComponentType<{ className?: string }>> = {
  emerald: ArrowDownCircle,
  blue: Landmark,
  rose: AlertTriangle,
  amber: ArrowUpCircle,
};

const gradientes = {
  emerald: "border-emerald-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-emerald-500/10",
  blue: "border-cyan-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-cyan-500/10",
  rose: "border-rose-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-rose-500/10",
  amber: "border-amber-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-amber-500/10",
};

type RecebimentosKpisProps = {
  itens: RecebimentosKpi[];
  carregando: boolean;
};

export function RecebimentosKpis({ itens, carregando }: RecebimentosKpisProps) {
  if (carregando) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <div key={`recebimentos-kpi-${indice}`} className="h-32 rounded-2xl border border-border bg-background-elevated animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {itens.map((item) => {
        const Icone = icones[item.tom];
        return (
          <article key={item.id} className={cn("relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", gradientes[item.tom])}>
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-foreground/5 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">{item.rotulo}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{item.valor}</p>
                <p className="mt-1 text-sm text-foreground-muted">{item.apoio}</p>
                {item.tendencia ? <p className="mt-2 text-xs font-medium text-foreground-muted">{item.tendencia}</p> : null}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-background-elevated/90 shadow-sm">
                <Icone className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
