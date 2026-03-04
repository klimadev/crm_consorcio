"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type EquipeTabsProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeTabs({ vm }: EquipeTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/60 bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "rounded-xl px-4",
          vm.abaAtiva === "colaboradores"
            ? "bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
            : "text-slate-600 hover:bg-slate-100",
        )}
        onClick={() => vm.setAbaAtiva("colaboradores")}
      >
        Colaboradores
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "rounded-xl px-4",
          vm.abaAtiva === "pdvs"
            ? "bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
            : "text-slate-600 hover:bg-slate-100",
        )}
        onClick={() => vm.setAbaAtiva("pdvs")}
      >
        Gestao de PDVs
      </Button>
    </div>
  );
}
