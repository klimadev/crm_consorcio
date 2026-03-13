import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

type MetasKPI = {
  totalAtivas: number;
  mediaGeral: number;
  emRisco: number;
  concluidas: number;
  tendencia?: number; // % vs período anterior
};

type MetasKPIHeaderProps = {
  kpis: MetasKPI;
  className?: string;
};

// Cores por status
function getStatusColor(percentual: number): { bg: string; text: string; border: string } {
  if (percentual >= 70) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (percentual >= 50) {
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  }
  return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
}

function getTendenciaIcon(tendencia: number | undefined) {
  if (tendencia === undefined || tendencia === 0) {
    return <Minus className="h-4 w-4 text-slate-400" />;
  }
  if (tendencia > 0) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  }
  return <TrendingDown className="h-4 w-4 text-rose-500" />;
}

function getTendenciaLabel(tendencia: number | undefined) {
  if (tendencia === undefined || tendencia === 0) {
    return "Estável";
  }
  if (tendencia > 0) {
    return `+${tendencia}%`;
  }
  return `${tendencia}%`;
}

export function MetasKPIHeader({ kpis, className }: MetasKPIHeaderProps) {
  const status = getStatusColor(kpis.mediaGeral);
  const temTendencia = kpis.tendencia !== undefined;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {/* Status Geral */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 shadow-sm",
          status.bg,
          status.border
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Status Geral
            </p>
            <p className={cn("mt-2 text-3xl font-bold tracking-tight", status.text)}>
              {kpis.mediaGeral}%
            </p>
            <p className="mt-1 text-sm text-slate-600">média de progresso</p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", status.bg)}>
            <Target className={cn("h-5 w-5", status.text)} />
          </div>
        </div>
        
        {temTendencia && (
          <div className="mt-3 flex items-center gap-1.5">
            {getTendenciaIcon(kpis.tendencia)}
            <span className="text-xs font-medium text-slate-600">
              {getTendenciaLabel(kpis.tendencia)} vs mês anterior
            </span>
          </div>
        )}
      </div>

      {/* Total de Metas Ativas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Metas Ativas
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {kpis.totalAtivas}
            </p>
            <p className="mt-1 text-sm text-slate-600">metas em andamento</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-slate-600">
            {kpis.concluidas} concluídas este período
          </span>
        </div>
      </div>

      {/* Em Risco */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Em Risco
            </p>
            <p className={cn(
              "mt-2 text-3xl font-bold tracking-tight",
              kpis.emRisco > 0 ? "text-rose-600" : "text-slate-900"
            )}>
              {kpis.emRisco}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {kpis.emRisco === 1 ? "meta abaixo de 50%" : "metas abaixo de 50%"}
            </p>
          </div>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            kpis.emRisco > 0 ? "bg-rose-50" : "bg-slate-50"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              kpis.emRisco > 0 ? "text-rose-600" : "text-slate-400"
            )} />
          </div>
        </div>
        
        {kpis.emRisco > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-medium text-rose-600">
              Requer atenção imediata
            </span>
          </div>
        )}
      </div>

      {/* Concluídas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Concluídas
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
              {kpis.concluidas}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              de {kpis.totalAtivas + kpis.concluidas} metas
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
        
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${kpis.totalAtivas + kpis.concluidas > 0 
                  ? (kpis.concluidas / (kpis.totalAtivas + kpis.concluidas)) * 100 
                  : 0}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
