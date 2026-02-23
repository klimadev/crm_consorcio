"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseEquipeModuleReturn } from "../types";

type EquipeFiltersProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeFilters({ vm }: EquipeFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            placeholder="Buscar por nome, email ou PDV..."
            value={vm.busca}
            onChange={(e) => vm.atualizarParametrosUrl({ busca: e.target.value || null }, true)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={vm.statusFiltro} onValueChange={(valor) => vm.atualizarParametrosUrl({ status: valor }, true)}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativos</SelectItem>
              <SelectItem value="INATIVO">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vm.cargoFiltro} onValueChange={(valor) => vm.atualizarParametrosUrl({ cargo: valor }, true)}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="COLABORADOR">Colaborador</SelectItem>
              <SelectItem value="GERENTE">Gerente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
