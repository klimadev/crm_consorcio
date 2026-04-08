"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResumoFunnelChart({ dados }: { dados: Array<{ label: string; ganhos: number; perdidos: number; abertos: number }> }) {
  return (
    <Card className="rounded-[1.5rem] border-border bg-background-surface shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Evolucao do funil</CardTitle>
        <p className="text-sm text-foreground-muted">Ganhos (verde), abertos (azul) e perdidos (rose) por mes.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] sm:h-[300px] lg:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} barCategoryGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString("pt-BR")} negocio${Number(value) === 1 ? "" : "s"}`} />
              <Bar dataKey="ganhos" name="Ganhos" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="abertos" name="Abertos" fill="#3b82f6" stackId="a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="perdidos" name="Perdidos" fill="#f43f5e" stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
