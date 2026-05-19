"use client";

import { Check, Smartphone, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsappInstancia } from "@/modules/whatsapp/types";

type Props = {
  instances: WhatsappInstancia[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  carregando: boolean;
  erro: string | null;
};

export function InstanciaSelector({
  instances,
  selectedIds,
  onToggle,
  carregando,
  erro,
}: Props) {
  if (carregando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
        {erro}
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
        <Smartphone className="mx-auto mb-2 h-8 w-8 text-foreground-muted" />
        <p className="text-sm text-foreground-muted">
          Nenhuma instancia WhatsApp disponivel.
        </p>
      </div>
    );
  }

  const conectada = (status: string) =>
    status === "connected" || status === "open";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {instances.map((inst) => {
        const ativo = selectedIds.includes(inst.id);
        const online = conectada(inst.status);

        return (
          <button
            key={inst.id}
            type="button"
            onClick={() => onToggle(inst.id)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
              ativo
                ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                : "border-border bg-background-surface hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                ativo
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-border bg-muted/50",
              )}
            >
              {ativo && <Check className="h-3 w-3 text-white" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {inst.profile_name ?? inst.nome}
                </span>
                {online ? (
                  <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                )}
              </div>
              <p className="truncate text-xs text-foreground-muted">
                {inst.phone ?? "Sem telefone"}
              </p>
              <p className="mt-0.5 text-[11px] text-foreground-disabled">
                {inst.instance_name}
              </p>
            </div>

            {online && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                Online
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
