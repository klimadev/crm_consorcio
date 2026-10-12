"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";
import { RecebimentosKpis } from "./recebimentos-kpis";
import { RecebimentosChartCard } from "./recebimentos-chart-card";
import { RecebimentosStatusDonut } from "./recebimentos-status-donut";
import { RecebimentosFilters } from "./recebimentos-filters";

// A analítica desce para um clique de distância: o dia a dia é a carteira,
// o Panorama abre quando a pessoa quer ler indicadores e gráficos.
export function Panorama({ vm }: { vm: UseRecebimentosModuleReturn }) {
  const [aberto, setAberto] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background-surface px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")} />
          Panorama: indicadores, gráficos e filtros avançados
        </span>
        <span className="shrink-0 text-xs text-foreground-muted">{aberto ? "recolher" : "abrir"}</span>
      </button>

      {aberto ? (
        <div className="space-y-6 pt-6">
          <RecebimentosKpis itens={vm.kpis} carregando={vm.carregando} />
          <div className="grid gap-4 2xl:grid-cols-[1.45fr_0.95fr]">
            <RecebimentosChartCard dados={vm.graficos.recebimentosPorPeriodo} />
            <RecebimentosStatusDonut distribuicao={vm.graficos.distribuicaoStatus} churn={vm.churn} />
          </div>
          <RecebimentosFilters vm={vm} />
        </div>
      ) : null}
    </section>
  );
}
