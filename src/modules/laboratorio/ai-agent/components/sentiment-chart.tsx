"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LeadAnalysis, Sentimento } from "../types";
import { SENTIMENTO_CORES, SENTIMENTO_LABEL } from "../types";

type Props = {
  analysis: LeadAnalysis[];
};

export function SentimentChart({ analysis }: Props) {
  const sentimentCounts = analysis.reduce(
    (acc, lead) => {
      const s = lead.sentiment;
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = (Object.keys(SENTIMENTO_LABEL) as Sentimento[])
    .filter((s) => (sentimentCounts[s] ?? 0) > 0)
    .map((s) => ({
      name: SENTIMENTO_LABEL[s],
      value: sentimentCounts[s] ?? 0,
      color: SENTIMENTO_CORES[s],
    }));

  if (data.length === 0) {
    return null;
  }

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="rounded-xl border border-border bg-background-surface p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Distribuição de Sentimentos
      </h3>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                `${value} lead${value !== 1 ? "s" : ""} (${((Number(value) / total) * 100).toFixed(0)}%)`,
              ]}
              contentStyle={{
                background: "var(--color-background-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-foreground-muted">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
