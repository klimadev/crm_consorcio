"use client";

import { cn } from "@/lib/utils";
import type { ConversaResumo } from "../types";

function formatarTimestamp(timestamp: number): string {
  const data = new Date(timestamp * 1000);
  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) {
    return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDias === 1) return "Ontem";
  if (diffDias < 7) {
    return data.toLocaleDateString("pt-BR", { weekday: "short" });
  }
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function truncar(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

type Props = {
  conversa: ConversaResumo;
  ativa: boolean;
  onClick: () => void;
};

export function ChatListItem({ conversa, ativa, onClick }: Props) {
  const iniciais = conversa.leadNome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
        ativa && "bg-emerald-50 hover:bg-emerald-50",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          ativa ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600",
        )}
      >
        {iniciais}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm font-medium", ativa ? "text-emerald-900" : "text-slate-900")}>
            {conversa.leadNome}
          </span>
          {conversa.ultimaMensagem && (
            <span className="shrink-0 text-xs text-slate-400">
              {formatarTimestamp(conversa.ultimaMensagem.timestamp)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500">
            {conversa.ultimaMensagem
              ? `${conversa.ultimaMensagem.fromMe ? "Voce: " : ""}${truncar(conversa.ultimaMensagem.conteudo, 40)}`
              : "Nenhuma mensagem"}
          </p>
          {conversa.naoLidas > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
              {conversa.naoLidas > 99 ? "99+" : conversa.naoLidas}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
