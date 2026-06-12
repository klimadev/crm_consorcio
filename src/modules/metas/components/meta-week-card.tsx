"use client";

import { useState } from "react";
import { Archive, Edit2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formataMoeda } from "@/lib/utils";
import type { Meta } from "@/modules/metas/types";

type Props = {
  meta: Meta;
  onEditar: (meta: Meta) => void;
  onArquivar: (id: string) => void;
};

function statusLabel(status: string): string {
  switch (status) {
    case "no_ritmo": return "No ritmo";
    case "atencao": return "Atenção";
    case "fora": return "Fora";
    default: return "Sem meta";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "no_ritmo": return "bg-success/15 text-success border-success/30";
    case "atencao": return "bg-warning/15 text-warning border-warning/30";
    case "fora": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-foreground-muted border-border";
  }
}

function statusDot(status: string): string {
  switch (status) {
    case "no_ritmo": return "bg-success";
    case "atencao": return "bg-warning";
    case "fora": return "bg-destructive";
    default: return "bg-foreground-disabled";
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" });
}

export function MetaWeekCard({ meta, onEditar, onArquivar }: Props) {
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  const progresso = meta.progresso;
  const status = progresso?.status ?? "fora";

  if (!progresso) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
        <p className="text-xs text-foreground-muted">Carregando...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
        status === "no_ritmo" && "border-success/30 bg-success/[0.03]",
        status === "atencao" && "border-warning/30 bg-warning/[0.03]",
        status === "fora" && "border-destructive/30 bg-destructive/[0.03]",
      )}
    >
      {/* Percentual grande */}
      <div className="flex items-center justify-between">
        <span className={cn("text-3xl font-bold tabular-nums", statusColor(status).split(" ")[1])}>
          {progresso.percentual}%
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusColor(status),
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
          {statusLabel(status)}
        </span>
      </div>

      {/* Datas */}
      <div className="text-xs text-foreground-muted">
        {formatDateShort(meta.data_inicio)} → {formatDateShort(meta.data_fim)}
      </div>

      {/* Realizado vs Alvo */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Realizado</span>
          <span className="font-medium tabular-nums">
            {meta.tipo_meta === "VOLUME" ? `${progresso.realizado}` : formataMoeda(progresso.realizado)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Alvo</span>
          <span className="font-medium tabular-nums">
            {meta.tipo_meta === "VOLUME" ? `${meta.alvo}` : formataMoeda(meta.alvo)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Faltante</span>
          <span className="font-medium tabular-nums text-destructive">
            {meta.tipo_meta === "VOLUME" ? `${progresso.faltante}` : formataMoeda(progresso.faltante)}
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === "no_ritmo" && "bg-success",
            status === "atencao" && "bg-warning",
            status === "fora" && "bg-destructive",
          )}
          style={{ width: `${Math.min(progresso.percentual, 100)}%` }}
        />
      </div>

      {/* Botões */}
      <div className="mt-1 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onEditar(meta)}>
          <Edit2 className="mr-1 h-3 w-3" />
          Editar
        </Button>
        {confirmandoArquivo ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => { onArquivar(meta.id); setConfirmandoArquivo(false); }}
            >
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setConfirmandoArquivo(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-foreground-muted"
            onClick={() => setConfirmandoArquivo(true)}
          >
            <Archive className="mr-1 h-3 w-3" />
            Arquivar
          </Button>
        )}
      </div>
    </div>
  );
}
