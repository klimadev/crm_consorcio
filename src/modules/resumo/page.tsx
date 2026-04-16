"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import type { Perfil } from "@/lib/tipos";
import { ResumoHeader } from "./components/resumo-header";
import { ResumoKpis } from "./components/resumo-kpis";
import { ResumoFunnelChart } from "./components/resumo-funnel-chart";
import { ResumoAtendentesDonut } from "./components/resumo-atendentes-donut";
import { ResumoAtendentesRanking } from "./components/resumo-atendentes-ranking";
import { ResumoPendenciasCard } from "./components/resumo-pendencias-card";
import { useResumoModule } from "./hooks/use-resumo-module";

export function ModuloResumo({ perfil, idUsuario, idPdv }: { perfil: Perfil; idUsuario: string; idPdv: string | null }) {
  const vm = useResumoModule({ perfil, idUsuario, idPdv });

  return (
    <ModulePageShell spacing="lg" className="bg-[radial-gradient(circle_at_top_left,rgba(79,140,255,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(70,211,154,0.10),transparent_28%),linear-gradient(180deg,#0b1120_0%,#10192b_100%)]">
      <ResumoHeader
        periodoSelecionado={vm.periodoSelecionado}
        onPeriodoChange={vm.setPeriodoSelecionado}
      />
      <InlineStatusAlert variant="error" message={vm.erro} />

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-background-elevated/90 p-4 shadow-sm shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">Atualizacao</p>
          <p className="text-sm text-foreground-muted">Dados consolidados em tempo real do escopo da sua conta.</p>
        </div>
        <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={() => void vm.recarregar()} disabled={vm.carregando}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar painel
        </Button>
      </div>

      <ResumoKpis itens={vm.kpis} carregando={vm.carregando} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ResumoFunnelChart
          dados={vm.dados?.graficos.evolucaoSemanal ?? []}
          periodo={vm.dados?.filtro.periodo.tipo ?? vm.periodoSelecionado}
        />
        <ResumoAtendentesDonut
          dados={(vm.dados?.graficos.participacaoAtendentes ?? []).map((item) => ({
            nome: item.nome,
            quantidade: item.quantidade,
            percentual: item.percentual,
            valor: item.valor,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ResumoAtendentesRanking dados={vm.dados?.rankings.atendentes ?? []} />
        <ResumoPendenciasCard pendencias={vm.dados?.operacao.pendencias ?? { total: 0, criticas: 0, alertas: 0, leadsImpactados: 0, itens: [] }} />
      </div>
    </ModulePageShell>
  );
}
