"use client";

import { Building2, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UseEquipeModuleReturn } from "../types";

type EquipePdvOverviewProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipePdvOverview({ vm }: EquipePdvOverviewProps) {
  const totalAtivos = vm.pdvs.reduce((acc, pdv) => acc + (pdv.funcionarios?.length ?? 0), 0);

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-background-surface px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
            Presença por PDV
          </p>
          <p className="text-sm text-foreground-muted">
            Clique em um PDV para ver os membros daquele time
          </p>
        </div>
        {vm.idPdvFiltro ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            onClick={() => vm.atualizarParametrosUrl({ id_pdv: null }, true)}
          >
            Ver todos PDVs
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          className={cn(
            "rounded-xl border p-3 text-left transition",
            !vm.idPdvFiltro
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-muted hover:bg-muted/80",
          )}
          onClick={() => vm.atualizarParametrosUrl({ id_pdv: null }, true)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">Todos</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xl font-bold">{totalAtivos}</p>
          <p className={cn("text-xs", !vm.idPdvFiltro ? "text-background/80" : "text-foreground-muted")}>
            colaboradores ativos
          </p>
        </button>

        {vm.pdvs.map((pdv) => {
          const selecionado = vm.idPdvFiltro === pdv.id;
          const total = pdv.funcionarios?.length ?? 0;

          return (
            <button
              key={pdv.id}
              type="button"
              className={cn(
                "rounded-xl border p-3 text-left transition",
                selecionado
                  ? "border-success/30 bg-success/10"
                  : "border-border hover:border-border/80 hover:bg-muted",
              )}
              onClick={() => vm.atualizarParametrosUrl({ id_pdv: pdv.id }, true)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-semibold text-foreground">
                  {pdv.nome}
                </span>
                {selecionado ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-foreground-disabled" />
                )}
              </div>
              <p className="mt-3 text-xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-foreground-muted">membros ativos</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
