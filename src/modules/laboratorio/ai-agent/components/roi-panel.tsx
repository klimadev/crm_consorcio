"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Users,
  Target,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import type { AnalysisResult, BatchWarning } from "../types";

type Props = {
  result: AnalysisResult;
  warnings: BatchWarning[];
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatarNumero(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

export function RoiPanel({ result, warnings }: Props) {
  const stats = useMemo(() => {
    const { summary } = result;
    const totalLeads = summary.totalLeads;
    const potencial = summary.potencialFaturamento || 0;
    const mediaPorLead = totalLeads > 0 ? potencial / totalLeads : 0;
    const vintePorcento = potencial * 0.2;
    const dezPorcento = potencial * 0.1;
    const leadsNaoFrios = totalLeads - summary.frios;

    return {
      potencial,
      mediaPorLead,
      vintePorcento,
      dezPorcento,
      totalLeads,
      leadsNaoFrios,
      quentes: summary.quentes,
      urgentes: summary.urgentes,
    };
  }, [result]);

  const { summary } = result;
  const houveBatching = summary.totalBatches > 1;

  return (
    <div className="space-y-4">
      {/* Hero Revenue Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-background-surface via-background-surface to-emerald-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Potencial de Faturamento
            </span>
          </div>

          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-bold text-emerald-400 tabular-nums">
              {formatarMoeda(stats.potencial)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
              <span className="text-[11px] text-foreground-muted uppercase tracking-wider block">
                Se converter 20%
              </span>
              <span className="text-lg font-semibold text-emerald-400 tabular-nums">
                {formatarMoeda(stats.vintePorcento)}
              </span>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
              <span className="text-[11px] text-foreground-muted uppercase tracking-wider block">
                Se converter 10%
              </span>
              <span className="text-lg font-semibold text-amber-400 tabular-nums">
                {formatarMoeda(stats.dezPorcento)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Total de Leads"
          value={formatarNumero(stats.totalLeads)}
          color="text-foreground"
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Com Interesse"
          value={formatarNumero(stats.leadsNaoFrios)}
          color="text-emerald-400"
        />
        <MetricCard
          icon={<Target className="h-4 w-4" />}
          label="Valor Médio"
          value={formatarMoeda(stats.mediaPorLead)}
          color="text-amber-400"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Leads Quentes"
          value={formatarNumero(stats.quentes + stats.urgentes)}
          color="text-emerald-400"
        />
      </div>

      {/* Batch Info */}
      {houveBatching && (
        <div className="rounded-lg border border-border bg-background-surface/50 px-4 py-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span>Processado</span>
            <span className="font-medium text-foreground">{summary.batchesProcessados}</span>
            <span>de</span>
            <span className="font-medium text-foreground">{summary.totalBatches}</span>
            <span>lotes</span>
            {summary.batchesComErro > 0 && (
              <span className="text-amber-400 flex items-center gap-1 ml-2">
                <AlertCircle className="h-3 w-3" />
                {summary.batchesComErro} com erro
              </span>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-300">
                {warnings.length} lote(s) com problemas
              </p>
              <ul className="space-y-0.5">
                {warnings.map((w) => (
                  <li key={w.batch} className="text-[11px] text-foreground-muted">
                    Lote {w.batch}: {w.erro}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-surface p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-foreground-muted">{icon}</span>
        <span className="text-[11px] text-foreground-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className={`text-xl font-bold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}
