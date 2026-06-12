"use client";

import { ArrowLeftRight, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodoDisponivel } from "@/modules/metas/types";

type Props = {
  mesReferencia: string;
  periodosDisponiveis: PeriodoDisponivel[];
  onMesChange: (mes: string) => void;
  comparacaoAtiva: boolean;
  onComparacaoToggle: (ativa: boolean) => void;
  mesComparacao: string;
  onMesComparacaoChange: (mes: string) => void;
  className?: string;
};

export function PeriodFilter({
  mesReferencia,
  periodosDisponiveis,
  onMesChange,
  comparacaoAtiva,
  onComparacaoToggle,
  mesComparacao,
  onMesComparacaoChange,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Select mês principal */}
      <Select value={mesReferencia} onValueChange={onMesChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodosDisponiveis.map((p) => (
            <SelectItem key={p.mes} value={p.mes}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle comparação */}
      <Button
        variant={comparacaoAtiva ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => onComparacaoToggle(!comparacaoAtiva)}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Comparar
      </Button>

      {/* Segundo select (mês comparação) */}
      {comparacaoAtiva && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground-muted">com</span>
          <Select value={mesComparacao} onValueChange={onMesComparacaoChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodosDisponiveis
                .filter((p) => p.mes !== mesReferencia)
                .map((p) => (
                  <SelectItem key={p.mes} value={p.mes}>
                    {p.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
