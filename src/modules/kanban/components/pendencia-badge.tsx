"use client";

import { AlertTriangle, FileX, Clock, Info, CreditCard } from "lucide-react";
import type { PendenciaGravidade, ResumoPendencias } from "../hooks/use-pendencias-globais";
import { TipoPendencia } from "@/lib/validacoes";
import { cn } from "@/lib/utils";

type PendenciaBadgeProps = {
  resumo?: ResumoPendencias;
  tamanho?: "sm" | "md";
  modoExpansivo?: boolean;
  className?: string;
};

const coresGravidade: Record<PendenciaGravidade, string> = {
  critica: "bg-destructive",
  alerta: "bg-warning",
  info: "bg-info",
};

export function PendenciaBadge({ resumo, tamanho = "sm", modoExpansivo = false, className }: PendenciaBadgeProps) {
  if (!resumo || resumo.total === 0) {
    if (modoExpansivo) {
      return (
        <div className={cn("flex items-center gap-2 text-foreground-muted", className)}>
          <Info className="h-4 w-4" />
          <span className="text-sm">Sem pendências</span>
        </div>
      );
    }
    return null;
  }

  if (modoExpansivo) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
            <span className={cn("flex items-center justify-center rounded-full font-semibold text-background", coresGravidade[resumo.porGravidade.critica > 0 ? "critica" : resumo.porGravidade.alerta > 0 ? "alerta" : "info"], tamanho === "sm" ? "h-5 w-5 text-xs" : "h-6 w-6 text-sm")}>
            {resumo.total}
          </span>
            <span className="text-sm font-medium text-foreground">
            {resumo.total} pendência{resumo.total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resumo.porGravidade.critica > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {resumo.porGravidade.critica} crítica{resumo.porGravidade.critica !== 1 ? "s" : ""}
            </span>
          )}
          {resumo.porGravidade.alerta > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning">
              <Clock className="h-3 w-3" />
              {resumo.porGravidade.alerta} alerta{resumo.porGravidade.alerta !== 1 ? "s" : ""}
            </span>
          )}
          {resumo.totalLeads > 0 && (
            <span className="text-foreground-muted">
              {resumo.totalLeads} lead{resumo.totalLeads !== 1 ? "s" : ""} impactado{resumo.totalLeads !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex cursor-pointer items-center gap-1", className)}>
      <span className={cn("flex items-center justify-center rounded-full font-semibold text-background shadow-sm", coresGravidade[resumo.porGravidade.critica > 0 ? "critica" : resumo.porGravidade.alerta > 0 ? "alerta" : "info"], tamanho === "sm" ? "h-5 w-5 text-xs" : "h-6 w-6 text-sm")}>
        {resumo.total}
      </span>
    </div>
  );
}

export function getClasseBordaGravidade(gravidade?: PendenciaGravidade): string {
  if (!gravidade) return "";
  switch (gravidade) {
    case "critica":
      return "border-l-4 border-l-destructive";
    case "alerta":
      return "border-l-4 border-l-warning";
    case "info":
      return "border-l-4 border-l-info";
  }
}

export function getIconePendencia(tipo: TipoPendencia) {
  switch (tipo) {
    case "DOCUMENTO_APROVACAO_PENDENTE":
      return FileX;
    case "PLANO_PAGAMENTO_PENDENTE":
      return CreditCard;
    case "ESTAGIO_PARADO":
      return Clock;
    default:
      return AlertTriangle;
  }
}
