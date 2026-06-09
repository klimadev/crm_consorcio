"use client";

import { ChevronRight, Store } from "lucide-react";

type EquipeBreadcrumbProps = {
  pdvNome: string;
  onVoltar: () => void;
};

export function EquipeBreadcrumb({ pdvNome, onVoltar }: EquipeBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={onVoltar}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-foreground-muted transition-all duration-200 hover:bg-muted hover:text-foreground"
      >
        <Store className="h-3.5 w-3.5" />
        Equipe
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-foreground-disabled" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 px-2.5 py-1 font-semibold text-foreground">
        {pdvNome}
      </span>
    </nav>
  );
}
