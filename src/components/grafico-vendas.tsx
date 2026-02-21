"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formataMoeda } from "@/lib/utils";

type Item = {
  mes: string;
  total: number;
};

type Props = {
  dados: Item[];
};

export function GraficoVendas({ dados }: Props) {
  return (
    <div className="min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip formatter={(valor) => formataMoeda(Number(valor))} />
          <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
