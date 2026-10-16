"use client";

import { Suspense, useState } from "react";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { useRecebimentosModule } from "./hooks/use-recebimentos-module";
import { RecebimentosHeader } from "./components/recebimentos-header";
import { RespostaDeHoje } from "./components/resposta-de-hoje";
import { CarteiraToolbar } from "./components/carteira-toolbar";
import { CarteiraLista } from "./components/carteira-lista";
import { PanoramaSheet } from "./components/panorama-sheet";
import { ModoFoco } from "./components/modo-foco";

export function ModuloRecebimentos() {
  return (
    <Suspense
      fallback={<div className="h-96 rounded-2xl border border-border bg-background-elevated animate-shimmer" />}
    >
      <PainelRecebimentos />
    </Suspense>
  );
}

function PainelRecebimentos() {
  const vm = useRecebimentosModule();
  const [focoAberto, setFocoAberto] = useState(false);
  const [panoramaAberto, setPanoramaAberto] = useState(false);

  return (
    <ModulePageShell spacing="lg">
      <RecebimentosHeader
        quantidadeMonitoradas={vm.resumo?.quantidadeMonitoradas ?? 0}
        temFiltrosAtivos={vm.temFiltrosAtivos}
      />

      <InlineStatusAlert variant="error" message={vm.erro} />

      <RespostaDeHoje
        carregando={vm.carregando}
        clientesEmAtraso={vm.contadoresChips.em_atraso}
        totalAtrasado={vm.resumo?.totalAtrasado ?? 0}
        vencendo7Dias={vm.resumo?.parcelasVencendo7Dias ?? 0}
        onIniciar={() => setFocoAberto(true)}
      />

      <CarteiraToolbar vm={vm} onAbrirPanorama={() => setPanoramaAberto(true)} />
      <CarteiraLista vm={vm} />

      <PanoramaSheet vm={vm} aberto={panoramaAberto} onOpenChange={setPanoramaAberto} />

      {focoAberto ? <ModoFoco vm={vm} onFechar={() => setFocoAberto(false)} /> : null}
    </ModulePageShell>
  );
}
