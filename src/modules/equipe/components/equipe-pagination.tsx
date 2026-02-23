"use client";

import { Users, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UseEquipeModuleReturn } from "../types";

type EquipePaginationProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipePagination({ vm }: EquipePaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <p className="text-sm font-medium text-slate-500">{vm.carregandoLista ? "Atualizando registros..." : `${vm.paginacao.total} registros no resultado atual.`}</p>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-slate-200"
          disabled={vm.paginacao.pagina <= 1}
          onClick={() => vm.atualizarParametrosUrl({ pagina: String(vm.paginacao.pagina - 1) })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm text-slate-600">
          {vm.paginacao.pagina} / {vm.paginacao.total_paginas}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-slate-200"
          disabled={vm.paginacao.pagina >= vm.paginacao.total_paginas}
          onClick={() => vm.atualizarParametrosUrl({ pagina: String(vm.paginacao.pagina + 1) })}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
