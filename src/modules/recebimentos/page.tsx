"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { useRecebimentosModule } from "./hooks/use-recebimentos-module";
import { RecebimentosHeader } from "./components/recebimentos-header";
import { RecebimentosKpis } from "./components/recebimentos-kpis";
import { RecebimentosFilters } from "./components/recebimentos-filters";
import { RecebimentosTabs } from "./components/recebimentos-tabs";
import { RecebimentosChartCard } from "./components/recebimentos-chart-card";
import { RecebimentosStatusDonut } from "./components/recebimentos-status-donut";
import { RecebimentosTable } from "./components/recebimentos-table";
import { RecebimentosMobileList } from "./components/recebimentos-mobile-list";
import { RecebimentosEmptyState } from "./components/recebimentos-empty-state";

export function ModuloRecebimentos() {
  const vm = useRecebimentosModule();

  return (
    <ModulePageShell spacing="lg">
      <RecebimentosHeader quantidadeMonitoradas={vm.resumo?.quantidadeMonitoradas ?? 0} temFiltrosAtivos={vm.temFiltrosAtivos} />

      <InlineStatusAlert variant="error" message={vm.erro} />

      <div className="flex justify-end">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => void vm.recarregar()} disabled={vm.carregando}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar painel
        </Button>
      </div>

      <RecebimentosKpis itens={vm.kpis} carregando={vm.carregando} />

      <div className="grid gap-4 2xl:grid-cols-[1.45fr_0.95fr]">
        <RecebimentosChartCard dados={vm.graficos.recebimentosPorPeriodo} />
        <RecebimentosStatusDonut dados={vm.graficos.distribuicaoStatus} />
      </div>

      <RecebimentosFilters vm={vm} />
      <RecebimentosTabs vm={vm} />

      {vm.carregando ? (
        <div className="rounded-2xl border border-border bg-background-surface p-6 shadow-sm animate-shimmer">
          <div className="h-80 rounded-xl bg-transparent" />
        </div>
      ) : vm.recebimentos.length === 0 ? (
        <RecebimentosEmptyState aba={vm.filtros.aba} />
      ) : (
        <>
          <RecebimentosMobileList vm={vm} />
          <div className="hidden md:block">
            <RecebimentosTable vm={vm} />
          </div>
        </>
      )}
    </ModulePageShell>
  );
}
