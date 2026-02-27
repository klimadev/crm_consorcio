"use client";

import { Shield, X } from "lucide-react";
import { useEquipeModule } from "./hooks/use-equipe-module";
import { EquipeHeader } from "./components/equipe-header";
import { EquipeKpiGrid } from "./components/equipe-header";
import { EquipeFilters } from "./components/equipe-filters";
import { EquipeBulkActions } from "./components/equipe-bulk-actions";
import { EquipeDesktopTable } from "./components/equipe-desktop-table";
import { EquipeMobileList } from "./components/equipe-mobile-list";
import { EquipePagination } from "./components/equipe-pagination";
import { NovoFuncionarioDialog } from "./components/dialogs/novo-funcionario-dialog";
import { InativacaoDialog } from "./components/dialogs/inativacao-dialog";
import type { Props } from "./types";

export function ModuloEquipe({ perfil }: Props) {
  const vm = useEquipeModule({ perfil });

  if (perfil === "COLABORADOR") {
    return (
      <section className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Acesso restrito</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Sem permissao para acessar equipe</h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          Este modulo e visivel apenas para perfis de gestao. Solicite ao administrador da empresa a elevacao de permissao.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <EquipeHeader vm={vm} />
      
      {vm.erroLista ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
            <X className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-sm font-medium text-rose-700">{vm.erroLista}</p>
        </div>
      ) : null}

      <EquipeKpiGrid vm={vm} />
      <EquipeFilters vm={vm} />
      <EquipeBulkActions vm={vm} />
      <EquipeMobileList vm={vm} />
      <EquipeDesktopTable vm={vm} />
      <EquipePagination vm={vm} />
      <NovoFuncionarioDialog vm={vm} />
      <InativacaoDialog vm={vm} />
    </section>
  );
}
