"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { formataMoeda } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ComparacaoItem, RankingItem } from "@/modules/metas/types";
import type { Meta } from "@/modules/metas/types";

type Props = {
  ranking: RankingItem[];
  rankingComparado: ComparacaoItem[];
  mediaGeral: number;
  totalParticipantes: number;
  comparacaoAtiva: boolean;
  dadosComparacao: { mes_referencia: string; ranking: RankingItem[]; media_geral: number } | null;
  metasPorEquipe: Map<string, Meta[]>;
};

// Cores por faixa de performance
function getBarColor(percentual: number): string {
  if (percentual >= 80) return "#22c55e"; // success/green
  if (percentual >= 45) return "#eab308"; // warning/yellow
  return "#ef4444"; // destructive/red
}

function getBarOpacity(percentual: number, isComparison: boolean): number {
  return isComparison ? 0.4 : 0.85;
}

function posicaoIcone(posicao: number) {
  if (posicao === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (posicao === 2) return <TrendingUp className="h-4 w-4 text-gray-400" />;
  if (posicao === 3) return <TrendingUp className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-foreground-muted">{posicao}º</span>;
}

/** Tooltip customizado do recharts */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  const perc = item.percentual ?? 0;
  const cor = getBarColor(perc);

  return (
    <div className="rounded-lg border border-border bg-background-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground">{item.nome}</p>
      <p className="mt-1 tabular-nums" style={{ color: cor }}>
        {item.percentual?.toFixed(1) ?? 0}%
      </p>
      {item.realizado != null && (
        <p className="text-xs text-foreground-muted">
          {formataMoeda(item.realizado)} de {formataMoeda(item.alvo)}
        </p>
      )}
    </div>
  );
}

export function MetaRanking({
  ranking,
  rankingComparado,
  mediaGeral,
  totalParticipantes,
  comparacaoAtiva,
  dadosComparacao,
  metasPorEquipe,
}: Props) {
  const [expandido, setExpandido] = useState<string | null>(null);

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
        <Users className="mb-2 h-8 w-8 text-foreground-disabled" />
        <p className="text-sm text-foreground-muted">Nenhum dado de ranking disponível.</p>
      </div>
    );
  }

  const toggleExpandido = (id: string) => {
    setExpandido((atual) => (atual === id ? null : id));
  };

  // Prepara dados para o gráfico com suporte a comparação
  const chartData = rankingComparado.length > 0 ? rankingComparado : ranking;

  const chartDataMapped = chartData.map((item) => {
    // Encontra dado de comparação para esta equipe
    const compRanking = dadosComparacao?.ranking ?? [];
    const compItem = compRanking.find((c: RankingItem) => c.id_equipe === item.id_equipe);
    const nome = (item as any).nome ?? "";
    return {
      id_equipe: (item as any).id_equipe ?? "",
      nome,
      nome_curto: nome.length > 18 ? nome.slice(0, 16) + "..." : nome,
      percentual: (item as any).percentual ?? 0,
      percentual_comparacao: compItem?.percentual ?? null,
      realizado: (item as any).realizado ?? 0,
      alvo: (item as any).alvo ?? 0,
      posicao: (item as any).posicao ?? 0,
      delta: "delta_percentual" in item ? (item as ComparacaoItem).delta_percentual : null,
    };
  });

  // Reverte para o gráfico (YAxis mostra de cima pra baixo)
  const chartDataSorted = [...chartDataMapped].reverse();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-foreground-muted" />
          <span className="text-foreground-muted">{totalParticipantes} equipes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground-muted">Média:</span>
          <span className="font-bold tabular-nums text-foreground">
            {mediaGeral.toFixed(1)}%
          </span>
          {comparacaoAtiva && dadosComparacao && (
            <span
              className={cn(
                "ml-1 text-xs font-medium",
                (mediaGeral ?? 0) >= (dadosComparacao.media_geral ?? 0)
                  ? "text-success"
                  : "text-destructive",
              )}
            >
              {(mediaGeral ?? 0) >= (dadosComparacao.media_geral ?? 0) ? "▲" : "▼"}
            </span>
          )}
        </div>
      </div>

      {/* Gráfico Recharts v3 */}
      {chartDataMapped.length > 0 && (
        <div className="rounded-xl border border-border bg-background-surface p-4">
          <ResponsiveContainer width="100%" height={Math.max(180, chartDataMapped.length * 48)}>
            <BarChart
              data={chartDataSorted}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="nome_curto"
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <ReferenceLine
                x={mediaGeral}
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity={0.3}
              />

              {/* Barra principal */}
              <Bar
                dataKey="percentual"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              >
                {chartDataSorted.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.percentual ?? 0)}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>

              {/* Barra de comparação (sobreposição) */}
              {comparacaoAtiva && (
                <Bar
                  dataKey="percentual_comparacao"
                  name="Anterior"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                >
                  {chartDataSorted.map((entry, index) => (
                    <Cell
                      key={`comp-cell-${index}`}
                      fill={getBarColor(entry.percentual ?? 0)}
                      fillOpacity={0.25}
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>

          {/* Legenda comparação */}
          {comparacaoAtiva && dadosComparacao && (
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-current opacity-85" />
                Atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-current opacity-25" />
                {dadosComparacao.mes_referencia}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lista de equipes */}
      <div className="space-y-2">
        {ranking.map((item) => {
          const compItem = rankingComparado.find((c) => c.id_equipe === item.id_equipe);
          const delta = compItem?.delta_percentual;
          const isExpanded = expandido === item.id_equipe;
          const metasDaEquipe = metasPorEquipe.get(item.id_equipe) ?? [];

          return (
            <div key={item.id_equipe} className="rounded-xl border border-border bg-background-surface">
              {/* Card principal */}
              <button
                type="button"
                onClick={() => toggleExpandido(item.id_equipe)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              >
                {/* Posição */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                  {posicaoIcone(item.posicao)}
                </div>

                {/* Nome + valores */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.nome}</p>
                  <p className="text-xs text-foreground-muted">
                    {item.realizado > 0 ? formataMoeda(item.realizado) : "R$ 0"} de {formataMoeda(item.alvo)}
                  </p>
                </div>

                {/* Percentual + delta */}
                <div className="text-right">
                  <p
                    className={cn(
                      "text-base font-bold tabular-nums",
                      item.percentual >= 80
                        ? "text-success"
                        : item.percentual >= 45
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    {item.percentual}%
                  </p>
                  {delta != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        delta >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {delta >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Mini barra */}
                <div className="hidden w-16 sm:block">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.percentual >= 80
                          ? "bg-success"
                          : item.percentual >= 45
                            ? "bg-warning"
                            : "bg-destructive",
                      )}
                      style={{ width: `${Math.min(item.percentual, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expand icon */}
                {metasDaEquipe.length > 0 && (
                  <div className="text-foreground-muted">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                )}
              </button>

              {/* Detalhes expandidos */}
              {isExpanded && metasDaEquipe.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">
                    Metas da equipe — {metasDaEquipe.length} semana(s)
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {metasDaEquipe.map((meta) => {
                      const p = meta.progresso;
                      if (!p) return null;
                      return (
                        <div
                          key={meta.id}
                          className={cn(
                            "rounded-lg border p-2.5 text-xs",
                            p.status === "no_ritmo"
                              ? "border-success/30 bg-success/[0.03]"
                              : p.status === "atencao"
                                ? "border-warning/30 bg-warning/[0.03]"
                                : "border-destructive/30 bg-destructive/[0.03]",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">S{meta.semana}</span>
                            <span
                              className={cn(
                                "tabular-nums font-bold",
                                p.status === "no_ritmo"
                                  ? "text-success"
                                  : p.status === "atencao"
                                    ? "text-warning"
                                    : "text-destructive",
                              )}
                            >
                              {p.percentual}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                p.status === "no_ritmo"
                                  ? "bg-success"
                                  : p.status === "atencao"
                                    ? "bg-warning"
                                    : "bg-destructive",
                              )}
                              style={{ width: `${Math.min(p.percentual, 100)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-foreground-muted">
                            {formataMoeda(p.realizado)} / {formataMoeda(meta.alvo)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
