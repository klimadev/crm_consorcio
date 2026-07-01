"use client";

import { useState } from "react";
import { Archive, Edit2, TrendingUp, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formataMoeda } from "@/lib/utils";
import type { Meta } from "@/modules/metas/types";

type Props = {
  meta: Meta;
  onEditar: (meta: Meta) => void;
  onArquivar: (id: string) => void;
  /** Versão compacta para empilhamento no slot semanal */
  compact?: boolean;
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

function statusBgBorder(status: string): string {
  switch (status) {
    case "no_ritmo": return "border-success/30 bg-success/[0.03]";
    case "atencao": return "border-warning/30 bg-warning/[0.03]";
    case "fora": return "border-destructive/30 bg-destructive/[0.03]";
    default: return "border-border bg-muted/40";
  }
}

function statusDotBg(status: string): string {
  switch (status) {
    case "no_ritmo": return "bg-success";
    case "atencao": return "bg-warning";
    case "fora": return "bg-destructive";
    default: return "bg-foreground-disabled";
  }
}

function statusBarBg(status: string): string {
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

function tipoIcon(tipo: string, origem: string) {
  if (tipo === "VOLUME") return <FileText className="h-3 w-3" />;
  if (origem === "PAGAMENTOS") return <DollarSign className="h-3 w-3" />;
  return <TrendingUp className="h-3 w-3" />;
}

function tipoLabel(meta: Meta): string {
  if (meta.tipo_meta === "VOLUME") return "Contratos";
  return meta.origem === "PAGAMENTOS" ? "Recebido" : "Fechado";
}

function CardCompact({ meta, onEditar, onArquivar }: Props) {
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  const progresso = meta.progresso;
  const status = progresso?.status ?? "fora";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-150",
        statusBgBorder(status),
        "hover:bg-muted/40",
      )}
    >
      {/* Dot de status */}
      <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDotBg(status))} />

      {/* Ícone do tipo */}
      <span className="shrink-0 text-foreground-muted">
        {tipoIcon(meta.tipo_meta, meta.origem)}
      </span>

      {/* Nome da meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">
          {meta.titulo || tipoLabel(meta)}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground-muted">
          <span>
            {meta.tipo_meta === "VOLUME"
              ? `${progresso?.realizado ?? 0}/${meta.alvo}`
              : `${formataMoeda(progresso?.realizado ?? 0)} / ${formataMoeda(meta.alvo)}`}
          </span>
        </div>
      </div>

      {/* Mini barra */}
      <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", statusBarBg(status))}
          style={{ width: `${Math.min(progresso?.percentual ?? 0, 100)}%` }}
        />
      </div>

      {/* Percentual */}
      <span
        className={cn(
          "min-w-[2.5rem] text-right text-xs font-bold tabular-nums",
          status === "no_ritmo" && "text-success",
          status === "atencao" && "text-warning",
          status === "fora" && "text-destructive",
        )}
      >
        {progresso?.percentual ?? 0}%
      </span>

      {/* Ações (aparecem no hover) */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => { e.stopPropagation(); onEditar(meta); }}
          title="Editar"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        {confirmandoArquivo ? (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onArquivar(meta.id); setConfirmandoArquivo(false); }}
            title="Confirmar arquivar"
          >
            <Archive className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-foreground-muted"
            onClick={(e) => { e.stopPropagation(); setConfirmandoArquivo(true); }}
            title="Arquivar"
          >
            <Archive className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CardFull({ meta, onEditar, onArquivar }: Props) {
  const [confirmandoArquivo, setConfirmandoArquivo] = useState(false);
  const progresso = meta.progresso;
  const status = progresso?.status ?? "fora";
  const sc = statusColor(status);

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
        statusBgBorder(status),
      )}
    >
      {/* Percentual grande */}
      <div className="flex items-center justify-between">
        <span className={cn("text-3xl font-bold tabular-nums", sc.split(" ")[1])}>
          {progresso.percentual}%
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            sc,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDotBg(status))} />
          {statusLabel(status)}
        </span>
      </div>

      {/* Título da meta */}
      <p className="text-xs font-medium text-foreground leading-tight">
        {meta.titulo || tipoLabel(meta)}
      </p>

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
          className={cn("h-full rounded-full transition-all duration-500", statusBarBg(status))}
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

export function MetaWeekCard(props: Props) {
  if (props.compact) {
    return <CardCompact {...props} />;
  }
  return <CardFull {...props} />;
}
