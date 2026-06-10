"use client";

import { useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Layers,
} from "lucide-react";
import type { AnalysisResult, LeadAnalysis, BatchWarning } from "../types";
import { PRIORIDADE_ORDER } from "../types";
import { SentimentChart } from "./sentiment-chart";
import { LeadInsightCard } from "./lead-insight-card";
import { RoiPanel } from "./roi-panel";

type Props = {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  onSend: (lead: LeadAnalysis) => Promise<void>;
  onCopy: (text: string) => void;
  sendingMap: Record<string, boolean>;
  sentMap: Record<string, boolean>;
  batchProgress: { current: number; total: number } | null;
  warnings: BatchWarning[];
};

export function AnalysisReport({
  result,
  loading,
  error,
  onSend,
  onCopy,
  sendingMap,
  sentMap,
  batchProgress,
  warnings,
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
            {batchProgress
              ? `Analisando lote ${batchProgress.current} de ${batchProgress.total}...`
              : "Analisando conversas com IA..."}
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            Isso pode levar alguns segundos dependendo da quantidade de conversas.
          </p>
        </div>
        {batchProgress && (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Layers className="h-3.5 w-3.5" />
            <span>Lote {batchProgress.current}/{batchProgress.total}</span>
          </div>
        )}
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
          <p className="text-sm font-medium text-foreground">Erro na análise</p>
          <p className="text-xs text-foreground-muted mt-1 max-w-md text-center">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Empty / invalid state
  if (!result || !result.summary || !result.analysis || result.analysis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <BarChart3 className="h-8 w-8 text-foreground-muted" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
          <p className="text-xs text-foreground-muted mt-1">
            Selecione instâncias e clique em &quot;Analisar com IA&quot; para come&ccedil;ar.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="space-y-6">
      {/* ROI Panel */}
      <RoiPanel result={result} warnings={warnings} />

      {/* Sentiment Chart */}
      {result.analysis.length >= 2 && <SentimentChart analysis={result.analysis} />}

      {/* Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Leads Analisados
          <span className="text-foreground-muted font-normal">
            {" "}&middot; Ordenados por prioridade
          </span>
        </h3>
        <div className="space-y-3">
          {sortedAnalysis.map((lead, index) => (
            <LeadInsightCard
              key={`${lead.phoneNumber}-${index}`}
              lead={lead}
              onSend={onSend}
              onCopy={onCopy}
              sending={sendingMap[lead.phoneNumber] || false}
              sent={sentMap[lead.phoneNumber] || false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
