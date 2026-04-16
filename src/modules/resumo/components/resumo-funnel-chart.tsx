"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ResumoFunnelChart({
  dados,
  periodo,
}: {
  dados: Array<{
    label: string;
    cotas: number;
    volume: number;
    metaCotas: number;
    metaVolume: number;
    bateuMetaCotas: boolean;
    bateuMetaVolume: boolean;
  }>;
  periodo: "todo" | "mensal" | "semanal";
}) {
  const titulo = periodo === "todo" ? "Evolucao anual" : periodo === "semanal" ? "Evolucao semanal" : "Evolucao mensal";
  const descricao = periodo === "todo"
    ? "Comparativo de cotas e volume por mes nos ultimos 12 meses."
    : periodo === "semanal"
      ? "Comparativo diario de cotas fechadas e volume nesta semana."
      : "Comparativo de cotas fechadas e volume no mes selecionado.";
  const maiorMetaVolume = dados.reduce((maior, item) => Math.max(maior, item.metaVolume), 0);
  const maiorMetaCotas = dados.reduce((maior, item) => Math.max(maior, item.metaCotas), 0);
  const mostrarEixoCotas = dados.some((item) => item.cotas > 0 || item.metaCotas > 0);
  const mostrarEixoVolume = dados.some((item) => item.volume > 0 || item.metaVolume > 0);

  const renderMetaBadge = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    payload?: { bateuMetaCotas?: boolean; bateuMetaVolume?: boolean; metaCotas?: number; metaVolume?: number };
  }) => {
    const { x, y, width, payload } = props;
    const xNumero = typeof x === "number" ? x : Number(x);
    const yNumero = typeof y === "number" ? y : Number(y);
    const widthNumero = typeof width === "number" ? width : Number(width);

    if (!Number.isFinite(xNumero) || !Number.isFinite(yNumero) || !Number.isFinite(widthNumero) || !payload || (!payload.metaCotas && !payload.metaVolume)) {
      return null;
    }

    const bateu = Boolean(payload.bateuMetaCotas || payload.bateuMetaVolume);
    return (
      <g>
        <rect
          x={xNumero + (widthNumero / 2) - 38}
          y={yNumero - 22}
          width={76}
          height={16}
          rx={8}
          ry={8}
          fill={bateu ? "#059669" : "#0f172a"}
          fillOpacity={0.95}
        />
        <text
          x={xNumero + (widthNumero / 2)}
          y={yNumero - 10}
          textAnchor="middle"
          fill="#f8fafc"
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.2 }}
        >
          {bateu ? "Meta batida" : "Meta parcial"}
        </text>
      </g>
    );
  };

  return (
    <Card className="rounded-[1.5rem] border-border bg-background-surface shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{titulo}</CardTitle>
        <p className="text-sm text-foreground-muted">{descricao}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] sm:h-[300px] lg:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} barCategoryGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              {mostrarEixoCotas && (
                <YAxis
                  yAxisId="cotas"
                  orientation="left"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#0369a1", fontSize: 11 }}
                />
              )}
              {mostrarEixoVolume && (
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tickFormatter={(valor) => {
                    const numero = Number(valor);
                    if (numero >= 1000) return `R$ ${(numero / 1000).toFixed(0)}k`;
                    return `R$ ${numero.toFixed(0)}`;
                  }}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#047857", fontSize: 11 }}
                />
              )}
              {maiorMetaCotas > 0 && (
                <ReferenceLine
                  yAxisId="cotas"
                  y={maiorMetaCotas}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: "Linha de meta (cotas)", position: "insideTopLeft", fill: "#0369a1", fontSize: 11 }}
                />
              )}
              {maiorMetaVolume > 0 && (
                <ReferenceLine
                  yAxisId="volume"
                  y={maiorMetaVolume}
                  stroke="#f59e0b"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{ value: "Linha de meta (R$)", position: "insideTopRight", fill: "#b45309", fontSize: 11 }}
                />
              )}
              <Tooltip
                formatter={(valor, nome) => {
                  if (nome === "Volume") {
                    return formatadorMoeda.format(Number(valor));
                  }

                  const numero = Number(valor);
                  return `${numero.toLocaleString("pt-BR")} cota${numero === 1 ? "" : "s"}`;
                }}
                labelFormatter={(_, payload) => {
                  const ponto = payload?.[0]?.payload as { cotas?: number; volume?: number; metaCotas?: number; metaVolume?: number; bateuMetaCotas?: boolean; bateuMetaVolume?: boolean } | undefined;
                  if (!ponto) return "";
                  const metaTexto = (ponto.metaCotas || ponto.metaVolume)
                    ? ` | Meta ${ponto.metaCotas ?? 0} cotas / ${formatadorMoeda.format(ponto.metaVolume ?? 0)}`
                    : "";
                  const statusMeta = (ponto.metaCotas || ponto.metaVolume)
                    ? ` | ${ponto.bateuMetaCotas || ponto.bateuMetaVolume ? "Meta batida" : "Meta em andamento"}`
                    : "";
                  return `${ponto.cotas ?? 0} Cotas | ${formatadorMoeda.format(ponto.volume ?? 0)}${metaTexto}${statusMeta}`;
                }}
              />
              <Bar yAxisId="cotas" dataKey="cotas" name="Cotas" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="#10b981" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="volume" content={renderMetaBadge} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
