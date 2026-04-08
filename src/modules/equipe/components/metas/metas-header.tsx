"use client";

import { Building2, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetasHeaderProps = {
  vm: UseMetasModuleReturn;
};

export function MetasHeader({ vm }: MetasHeaderProps) {
  const mostrarSeletorPdv = vm.perfil === "EMPRESA" && vm.opcoesPdvs.length > 1;
  const equipeAtual = vm.opcoesPdvs.find((pdv) => pdv.id === (vm.pdvSelecionado ?? vm.opcoesPdvs[0]?.id));

  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-background-surface shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)]">
      <div className="border-b border-border bg-gradient-to-br from-success/8 via-background-surface to-background px-5 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-success/25 bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-success">
                Mapa semanal
              </span>
              <span className="text-xs font-medium text-foreground-muted">Leitura rapida, sem depender do titulo da meta.</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground sm:text-3xl">Metas por equipe</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              Veja em segundos quais semanas estao saudaveis, quais pedem atencao e onde o time precisa reagir agora.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="rounded-2xl border-border bg-background/90" onClick={() => void vm.recarregar()} disabled={vm.carregando}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>

            {vm.podeCriarMeta ? (
              <Button type="button" className="rounded-2xl bg-success hover:bg-success/90" onClick={vm.abrirNovaMeta}>
                <Plus className="mr-2 h-4 w-4" />
                Nova meta
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          {mostrarSeletorPdv ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">Filtrar equipe</p>
              <Select value={vm.pdvSelecionado ?? "todas"} onValueChange={(value) => vm.setPdvSelecionado(value === "todas" ? null : value)}>
                <SelectTrigger className="h-11 w-full rounded-2xl border-border bg-muted md:w-[260px]">
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as equipes</SelectItem>
                  {vm.opcoesPdvs.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-success shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-success">Equipe em foco</p>
                <p className="text-sm font-semibold text-foreground">{equipeAtual?.nome ?? "Todas as equipes"}</p>
              </div>
            </div>
          )}

          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-muted/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Semanas no painel</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">{vm.metasFiltradas.length}</p>
            </div>
            <div className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-success">Semanas saudaveis</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">{vm.resumo.equipesNoRitmo}</p>
            </div>
            <div className="rounded-2xl border border-info/25 bg-info/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-info">Media do ciclo</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">{vm.resumo.mediaPercentual.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-muted/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Como ler</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-muted">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Verde: no ritmo</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Amarelo: pede atencao</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Vermelho: agir agora</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-foreground/60" /> Sequencia visual: Semana 1 a 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
