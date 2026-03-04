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
    <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Presenca por PDV</p>
          <p className="text-sm text-slate-600">Clique em um PDV para ver os membros daquele time</p>
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
            !vm.idPdvFiltro ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 hover:bg-slate-100",
          )}
          onClick={() => vm.atualizarParametrosUrl({ id_pdv: null }, true)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">Todos</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xl font-bold">{totalAtivos}</p>
          <p className={cn("text-xs", !vm.idPdvFiltro ? "text-slate-200" : "text-slate-500")}>colaboradores ativos</p>
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
                selecionado ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
              onClick={() => vm.atualizarParametrosUrl({ id_pdv: pdv.id }, true)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-semibold text-slate-800">{pdv.nome}</span>
                {selecionado ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Building2 className="h-4 w-4 text-slate-400" />}
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">membros ativos</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
