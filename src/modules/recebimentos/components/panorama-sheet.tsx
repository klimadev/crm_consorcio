"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UseRecebimentosModuleReturn } from "../types";
import { RecebimentosKpis } from "./recebimentos-kpis";
import { RecebimentosChartCard } from "./recebimentos-chart-card";
import { RecebimentosStatusDonut } from "./recebimentos-status-donut";
import { RecebimentosFilters } from "./recebimentos-filters";

type PanoramaSheetProps = {
  vm: UseRecebimentosModuleReturn;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
};

// A análise mora em uma sala lateral: um clique no topo da carteira, sem
// empurrar a lista para baixo. O recorte aplicado aqui vale para a carteira.
export function PanoramaSheet({ vm, aberto, onOpenChange }: PanoramaSheetProps) {
  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-4 py-3 sm:px-6">
          <SheetTitle className="text-base">Panorama da operação</SheetTitle>
          <SheetDescription className="text-xs">
            Indicadores, gráficos e filtros avançados. O recorte vale para a carteira inteira.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <RecebimentosKpis itens={vm.kpis} carregando={vm.carregando} />
          <RecebimentosChartCard dados={vm.graficos.recebimentosPorPeriodo} />
          <RecebimentosStatusDonut distribuicao={vm.graficos.distribuicaoStatus} churn={vm.churn} />
          <RecebimentosFilters vm={vm} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
