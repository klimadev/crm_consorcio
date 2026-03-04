"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseEquipeModuleReturn } from "../types";

type EquipeFiltersProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeFilters({ vm }: EquipeFiltersProps) {
  const temFiltrosAtivos = vm.busca || vm.idPdvFiltro || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";

  // Debounce para a busca - evita requests excessivos a cada digitação
  const [buscaTempoReal, setBuscaTempoReal] = useState(vm.busca);

  // Sincroniza com o valor da URL quando muda externamente
  useEffect(() => {
    const sincronizacao = setTimeout(() => {
      setBuscaTempoReal(vm.busca);
    }, 0);

    return () => clearTimeout(sincronizacao);
  }, [vm.busca]);

  // Aplica debounce - só atualiza a URL após 400ms sem digitar
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (buscaTempoReal !== vm.busca) {
        vm.atualizarParametrosUrl({ busca: buscaTempoReal || null }, true);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [buscaTempoReal, vm.busca, vm]);

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            placeholder="Buscar por nome, email ou PDV..."
            value={buscaTempoReal}
            onChange={(e) => setBuscaTempoReal(e.target.value)}
            aria-label="Buscar colaboradores por nome, email ou PDV"
          />
          {/* Indicador discreto de atualização em segundo plano */}
          {vm.atualizando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={vm.statusFiltro} onValueChange={(valor) => vm.atualizarParametrosUrl({ status: valor }, true)}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos ({vm.contadoresFiltro.status.TODOS})</SelectItem>
              <SelectItem value="ATIVO">Ativos ({vm.contadoresFiltro.status.ATIVO})</SelectItem>
              <SelectItem value="INATIVO">Inativos ({vm.contadoresFiltro.status.INATIVO})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={vm.cargoFiltro} onValueChange={(valor) => vm.atualizarParametrosUrl({ cargo: valor }, true)}>
            <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos ({vm.contadoresFiltro.cargo.TODOS})</SelectItem>
              <SelectItem value="COLABORADOR">Colaborador ({vm.contadoresFiltro.cargo.COLABORADOR})</SelectItem>
              <SelectItem value="GERENTE">Gerente ({vm.contadoresFiltro.cargo.GERENTE})</SelectItem>
              <SelectItem value="ADMINISTRADOR">Administrador ({vm.contadoresFiltro.cargo.ADMINISTRADOR})</SelectItem>
            </SelectContent>
          </Select>

          {temFiltrosAtivos && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={vm.limparFiltros}
            >
              <X className="mr-1.5 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
