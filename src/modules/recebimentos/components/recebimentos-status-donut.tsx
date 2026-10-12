"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formataMoeda } from "@/lib/utils";
import type { DistribuicaoStatusItem } from "@/lib/api/recebimentos";
import { isStatusPerdido, STATUS_RECEBIMENTO, type ChurnRecebimentos } from "../types";

type RecebimentosStatusDonutProps = {
  distribuicao: DistribuicaoStatusItem[];
  churn: ChurnRecebimentos;
};

const CIRCUNFERENCIA = 226;

export function RecebimentosStatusDonut({ distribuicao, churn }: RecebimentosStatusDonutProps) {
  const totalParcelas = distribuicao.reduce((acc, item) => acc + item.quantidade, 0) || 1;
  const fatias = distribuicao
    .filter((item) => item.quantidade > 0)
    .reduce<Array<DistribuicaoStatusItem & { dash: string; offset: number }>>((acc, item) => {
      const percentual = item.quantidade / totalParcelas;
      const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset - Number(acc[acc.length - 1].dash.split(" ")[0]);
      acc.push({
        ...item,
        dash: `${percentual * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`,
        offset,
      });
      return acc;
    }, []);

  const percentualRetencao = churn.taxaRetencaoParcelas * 100;
  const temChurn = churn.quantidadePerdidas > 0 || churn.totalPerdidoChurn > 0;

  return (
    <Card className="rounded-2xl border-border bg-background-surface shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Distribuicao por status</CardTitle>
        <p className="text-sm text-foreground-muted">Veja rapidamente onde estao os gargalos, a tracao dos recebimentos e a perda por churn.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="36" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              {fatias.map((item) => (
                <circle
                  key={item.status}
                  cx="50"
                  cy="50"
                  r="36"
                  fill="none"
                  stroke={STATUS_RECEBIMENTO[item.status].cor}
                  strokeWidth="12"
                  strokeDasharray={item.dash}
                  strokeDashoffset={item.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="absolute text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Parcelas</p>
              <p className="text-3xl font-bold text-foreground">{distribuicao.reduce((acc, item) => acc + item.quantidade, 0)}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {distribuicao.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_RECEBIMENTO[item.status].cor }} />
                  <div>
                    <p className={cn("text-sm font-medium text-foreground", isStatusPerdido(item.status) && "text-foreground-muted line-through")}>
                      {STATUS_RECEBIMENTO[item.status].rotulo}
                    </p>
                    <p className="text-xs text-foreground-muted">{item.quantidade} parcelas</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{formataMoeda(item.valor)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-background-surface via-background-elevated to-amber-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Perda por churn</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formataMoeda(churn.totalPerdidoChurn)}</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                {churn.quantidadePerdidas} parcelas perdidas
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  percentualRetencao >= 90
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600",
                )}
              >
                Retencao {percentualRetencao.toFixed(1)}%
              </span>
            </div>
          </div>

          {churn.churnPorParcela.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-foreground-muted">Canceladas por numero da parcela</p>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height={128}>
                  <BarChart data={churn.churnPorParcela}>
                    <XAxis
                      dataKey="numero_parcela"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(valor: number) => `#${valor}`}
                      tick={{ fontSize: 11, fill: "hsl(var(--foreground-muted))" }}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} tick={{ fontSize: 11, fill: "hsl(var(--foreground-muted))" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                      contentStyle={{
                        background: "hsl(var(--background-elevated))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "16px",
                        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
                      }}
                      labelFormatter={(valor) => `Parcela #${valor}`}
                      formatter={(valor, nome) => (nome === "quantidade" ? [`${valor} canceladas`, "Churn"] : [formataMoeda(Number(valor)), "Valor perdido"])}
                    />
                    <Bar dataKey="quantidade" name="quantidade" radius={[6, 6, 0, 0]}>
                      {churn.churnPorParcela.map((item) => (
                        <Cell key={item.numero_parcela} fill="#f59e0b" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-foreground-muted">
              {temChurn
                ? "Nao ha cancelamentos mapeados por numero de parcela neste recorte."
                : "Nenhuma parcela cancelada ou abortada neste recorte — retencao em alta."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
