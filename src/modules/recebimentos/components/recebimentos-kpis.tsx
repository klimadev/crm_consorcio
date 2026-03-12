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
  emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70",
  blue: "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-100/70",
  rose: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70",
  amber: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70",
};

type RecebimentosKpisProps = {
  itens: RecebimentosKpi[];
  carregando: boolean;
};

export function RecebimentosKpis({ itens, carregando }: RecebimentosKpisProps) {
  if (carregando) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, indice) => (
          <div key={`recebimentos-kpi-${indice}`} className="h-32 rounded-2xl border border-slate-200 bg-white animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {itens.map((item) => {
        const Icone = icones[item.tom];
        return (
          <article key={item.id} className={cn("relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", gradientes[item.tom])}>
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/30 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.rotulo}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.valor}</p>
                <p className="mt-1 text-sm text-slate-600">{item.apoio}</p>
                {item.tendencia ? <p className="mt-2 text-xs font-medium text-slate-500">{item.tendencia}</p> : null}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-sm">
                <Icone className="h-5 w-5 text-slate-700" />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
