"use client";

import { useMemo } from "react";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import type { AnalysisResult, LeadAnalysis } from "../types";
import { PRIORIDADE_ORDER } from "../types";
import { SentimentChart } from "./sentiment-chart";
import { LeadInsightCard } from "./lead-insight-card";

type Props = {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onSend: (lead: LeadAnalysis) => Promise<void>;
  onCopy: (text: string) => void;
  sendingMap: Record<string, boolean>;
  sentMap: Record<string, boolean>;
};

export function AnalysisReport({
  result,
  loading,
  error,
  onSend,
  onCopy,
  sendingMap,
  sentMap,
}: Props) {
  const sortedAnalysis = useMemo(() => {
    if (!result?.analysis) return [];
    return [...result.analysis].sort(
      (a, b) => PRIORIDADE_ORDER[a.prioridade] - PRIORIDADE_ORDER[b.prioridade],
    );
  }, [result]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Analisando conversas com IA...
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            Isso pode levar alguns segundos dependendo da quantidade de conversas.
          </p>
        </div>
        {/* Skeleton */}
        <div className="w-full space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Erro na análise
          </p>
          <p className="text-xs text-foreground-muted mt-1 max-w-md text-center">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result || result.analysis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <BarChart3 className="h-8 w-8 text-foreground-muted" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhum resultado
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            Selecione instâncias e clique em "Analisar com IA" para começar.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-background-surface p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{result.summary.totalLeads}</p>
          <p className="text-xs text-foreground-muted">Total de Leads</p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{result.summary.urgentes}</p>
          <p className="text-xs text-foreground-muted">🔥 Urgentes</p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{result.summary.quentes}</p>
          <p className="text-xs text-foreground-muted">⚡ Quentes</p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{result.summary.frios}</p>
          <p className="text-xs text-foreground-muted">❄️ Frios</p>
        </div>
      </div>

      {/* Sentiment Chart */}
      {result.analysis.length >= 2 && (
        <SentimentChart analysis={result.analysis} />
      )}

      {/* Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Leads Analisados
          <span className="text-foreground-muted font-normal">
            {" "}· Ordenados por prioridade
          </span>
        </h3>
        <div className="space-y-3">
          {sortedAnalysis.map((lead, index) => (
            <LeadInsightCard
              key={`${lead.phoneNumber}-${index}`}
              lead={lead}
              onSend={onSend}
              onCopy={onCopy}
              sending={sendingMap[lead.phoneNumber] ?? false}
              sent={sentMap[lead.phoneNumber] ?? false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
