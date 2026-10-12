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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(valor) => `R$ ${Math.round(Number(valor) / 1000)}k`} />
              <Tooltip
                contentStyle={{
                  background: "var(--background-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
                }}
                labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                itemStyle={{ color: "var(--foreground-muted)" }}
                cursor={{ fill: "rgb(148 163 184 / 0.08)" }}
                formatter={(valor) => formataMoeda(Number(valor))}
              />
              <Bar dataKey="previsto" name="Previsto" fill="var(--info)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recebido" name="Recebido" fill="var(--success)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
