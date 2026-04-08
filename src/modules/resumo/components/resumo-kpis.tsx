import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, LayoutDashboard } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { ResumoKpi } from "@/lib/api/resumo";

const icones: Record<ResumoKpi["tom"], ComponentType<{ className?: string }>> = {
  emerald: ArrowDownCircle,
  blue: LayoutDashboard,
  rose: AlertTriangle,
  amber: ArrowUpCircle,
};

const gradientes = {
  emerald: "border-emerald-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-emerald-500/10",
  blue: "border-cyan-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-cyan-500/10",
  rose: "border-rose-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-rose-500/10",
  amber: "border-amber-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-amber-500/10",
};

const coresTexto = {
  emerald: "text-emerald-600",
  blue: "text-cyan-600",
  rose: "text-rose-600",
  amber: "text-amber-600",
};

export function ResumoKpis({ itens, carregando }: { itens: ResumoKpi[]; carregando: boolean }) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-[1.5rem] border border-border bg-background-elevated animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {itens.map((item) => {
        const Icone = icones[item.tom];
        return (
          <article
            key={item.id}
            className={cn(
              "relative flex h-32 flex-col justify-between overflow-hidden rounded-[1.5rem] border p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:h-36 sm:p-4",
              gradientes[item.tom],
            )}
          >
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-foreground/5 blur-2xl sm:h-24 sm:w-24" />
            <div className="relative flex items-start justify-between gap-2">
              <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted sm:text-[11px]">{item.rotulo}</p>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background-elevated/90 shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
                <Icone className={cn("h-4 w-4 sm:h-5 sm:w-5", coresTexto[item.tom])} />
              </div>
            </div>
            <div className="relative">
              <p className={cn("text-lg font-extrabold tracking-tight sm:text-xl lg:text-2xl", coresTexto[item.tom])}>{item.valor}</p>
              {item.apoio && <p className="truncate text-[11px] text-foreground-muted sm:text-sm">{item.apoio}</p>}
              {item.tendencia && <p className="mt-1 inline-flex rounded-full bg-background-elevated px-2 py-0.5 text-[9px] font-medium text-foreground-muted sm:text-xs">{item.tendencia}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
