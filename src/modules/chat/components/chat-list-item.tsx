"use client";

import { Megaphone, MessageCircle, PenLine } from "lucide-react";
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

function getOrigemStyles(origem: string) {
  switch (origem) {
    case "ANUNCIO_CTWA":
      return {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-200",
        icon: Megaphone,
        label: "Anúncio",
      };
    case "SINCRONIZACAO_WHATSAPP":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: MessageCircle,
        label: "WhatsApp",
      };
    default:
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: PenLine,
        label: "Manual",
      };
  }
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

  const origemStyles = getOrigemStyles(conversa.leadOrigem);
  const OrigemIcon = origemStyles.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:bg-muted hover:shadow-sm hover:shadow-border/30",
        ativa && "bg-success/10 hover:bg-success/10 shadow-sm shadow-success/10",
      )}
    >
      {/* Borda lateral colorida por origem */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-r transition-opacity duration-200 group-hover:opacity-80",
           conversa.leadOrigem === "ANUNCIO_CTWA" && "bg-info",
           conversa.leadOrigem === "SINCRONIZACAO_WHATSAPP" && "bg-success",
           conversa.leadOrigem === "MANUAL" && "bg-warning",
        )}
      />

      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform duration-200 group-hover:scale-105",
           ativa ? "bg-success text-success-foreground" : "bg-muted text-foreground-muted group-hover:bg-muted/80",
        )}
      >
        {iniciais}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("truncate text-sm font-medium transition-colors duration-200", ativa ? "text-foreground" : "text-foreground group-hover:text-foreground")}>
              {conversa.leadNome}
            </span>
            {/* Badge de origem */}
            <span
              className={cn(
                "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200 sm:flex group-hover:scale-105",
                origemStyles.bg,
                origemStyles.text,
              )}
            >
              <OrigemIcon className="h-3 w-3" />
              {origemStyles.label}
            </span>
          </div>
          {conversa.ultimaMensagem && (
            <span className="shrink-0 text-xs text-foreground-muted transition-colors duration-200 group-hover:text-foreground-muted">
              {formatarTimestamp(conversa.ultimaMensagem.timestamp)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {/* Estágio abaixo do nome (mobile: só se não houver badge) */}
            {conversa.estagioNome && (
                <p className="truncate text-[10px] text-foreground-muted transition-colors duration-200 group-hover:text-foreground-muted">
                {conversa.estagioNome}
              </p>
            )}
            <p className="truncate text-xs text-foreground-muted transition-colors duration-200 group-hover:text-foreground-muted">
              {conversa.ultimaMensagem
                ? `${conversa.ultimaMensagem.fromMe ? "Você: " : ""}${truncar(conversa.ultimaMensagem.conteudo, 40)}`
                : "Nenhuma mensagem"}
            </p>
          </div>
          {conversa.naoLidas > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1.5 text-[10px] font-bold text-success-foreground transition-transform duration-200 group-hover:scale-110 group-hover:shadow-sm">
              {conversa.naoLidas > 99 ? "99+" : conversa.naoLidas}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
