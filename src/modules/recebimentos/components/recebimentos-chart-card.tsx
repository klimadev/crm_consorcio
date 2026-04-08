"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formataMoeda } from "@/lib/utils";

type RecebimentosChartCardProps = {
  dados: Array<{ label: string; recebido: number; previsto: number }>;
};

export function RecebimentosChartCard({ dados }: RecebimentosChartCardProps) {
  return (
    <Card className="rounded-2xl border-border bg-background-surface shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Fluxo de recebimento</CardTitle>
        <p className="text-sm text-foreground-muted">Compare o previsto com o efetivamente recebido ao longo do tempo.</p>
      </CardHeader>
      <CardContent>
        <div className="min-h-[280px] w-full">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(valor) => `R$ ${Math.round(Number(valor) / 1000)}k`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background-elevated))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                itemStyle={{ color: "hsl(var(--foreground-muted))" }}
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                formatter={(valor) => formataMoeda(Number(valor))}
              />
              <Bar dataKey="previsto" name="Previsto" fill="#93c5fd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
