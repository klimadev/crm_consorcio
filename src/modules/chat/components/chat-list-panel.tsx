"use client";

import { Loader2, MessageSquareOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversaResumo } from "../types";
import { ChatSearch } from "./chat-search";
import { ChatListItem } from "./chat-list-item";

type Props = {
  conversas: ConversaResumo[];
  conversaAtivaId: string | null;
  carregando: boolean;
  erro: string | null;
  busca: string;
  naoLidas: boolean;
  temMais: boolean;
  carregandoMais: boolean;
  onBuscar: (termo: string) => void;
  onFiltrarNaoLidas: (ativo: boolean) => void;
  onSelecionar: (conversa: ConversaResumo) => void;
  onCarregarMais: () => void;
};

export function ChatListPanel({
  conversas,
  conversaAtivaId,
  carregando,
  erro,
  busca,
  naoLidas,
  temMais,
  carregandoMais,
  onBuscar,
  onFiltrarNaoLidas,
  onSelecionar,
  onCarregarMais,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-200 p-3">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Conversas</h2>
        <ChatSearch valor={busca} onChange={onBuscar} />
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => onFiltrarNaoLidas(false)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !naoLidas
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => onFiltrarNaoLidas(true)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              naoLidas
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            Não Lidas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {process.env.NODE_ENV === "development" && (
          <div className="border-b border-dashed border-slate-200 px-4 py-2 text-[11px] text-slate-400">
            {`debug: conversas=${conversas.length} carregando=${carregando} erro=${erro ?? "-"}`}
          </div>
        )}
        {carregando && conversas.length === 0 && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {!carregando && conversas.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <MessageSquareOff className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {busca
                ? "Nenhuma conversa encontrada"
                : naoLidas
                  ? "Nenhuma mensagem não lida"
                  : "Nenhuma conversa ainda"}
            </p>
          </div>
        )}

        {erro && (
          <div className="px-4 py-3">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{erro}</p>
          </div>
        )}

        {conversas.map((conversa) => (
          <ChatListItem
            key={conversa.leadId}
            conversa={conversa}
            ativa={conversaAtivaId === conversa.leadId}
            onClick={() => onSelecionar(conversa)}
          />
        ))}

        {temMais && (
          <div className="p-3">
            <button
              type="button"
              onClick={onCarregarMais}
              disabled={carregandoMais}
              className="w-full rounded-lg border border-slate-200 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {carregandoMais ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Carregar mais"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
