"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProporcaoItem } from "@/modules/metas/types";

type Props = {
  proporcao: ProporcaoItem[];
  className?: string;
};

export function TeamProportion({ proporcao, className }: Props) {
  if (proporcao.length === 0) return null;

  const total = proporcao.reduce((acc, p) => acc + p.percentual, 0) || 1;
  const maxNomeLen = Math.max(...proporcao.map((p) => p.nome.length));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <Users className="h-3.5 w-3.5" />
        <span>Contribuição por equipe</span>
      </div>

      {/* Barra empilhada horizontal */}
      <div className="flex h-5 w-full overflow-hidden rounded-full border border-border bg-muted/30">
        {proporcao.map((item) => {
          const largura = (item.percentual / total) * 100;
          if (largura < 1) return null;
          return (
            <div
              key={item.id_equipe}
              className={cn("h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full", item.cor)}
              style={{ width: `${largura}%` }}
              title={`${item.nome}: ${item.percentual.toFixed(0)}%`}
            />
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {proporcao.map((item) => (
          <span key={item.id_equipe} className="inline-flex items-center gap-1 text-xs text-foreground-muted">
            <span className={cn("h-2 w-2 rounded-full shrink-0", item.cor)} />
            {item.nome}
            <span className="font-medium tabular-nums text-foreground">
              {item.percentual.toFixed(0)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
