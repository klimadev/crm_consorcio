"use client";

import { ArrowLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversaResumo, LeadDadosChat } from "../types";
import { ChatListPanel } from "./chat-list-panel";
import { ChatMessagesPanel } from "./chat-messages-panel";
import { ChatClientPanel } from "./chat-client-panel";
import type { useChatList } from "../hooks/use-chat-list";

type Props = {
  conversaSelecionada: ConversaResumo | null;
  mostrarDadosCliente: boolean;
  chatList: ReturnType<typeof useChatList>;
  leadDados: LeadDadosChat | null;
  carregandoLead: boolean;
  onSelecionarConversa: (c: ConversaResumo) => void;
  onVoltar: () => void;
  onAlternarDados: () => void;
};

export function ChatLayout({
  conversaSelecionada,
  mostrarDadosCliente,
  chatList,
  leadDados,
  carregandoLead,
  onSelecionarConversa,
  onVoltar,
  onAlternarDados,
}: Props) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm max-lg:flex-col">
      {/* Coluna 1: Lista de conversas */}
      <div className="min-h-0 w-full shrink-0 overflow-hidden border-b border-border lg:w-[248px] lg:border-b-0 lg:border-r xl:w-[264px]">
        <ChatListPanel
          conversas={chatList.conversas}
          conversaAtivaId={conversaSelecionada?.leadId ?? null}
          carregando={chatList.carregando}
          erro={chatList.erro}
          busca={chatList.busca}
          naoLidas={chatList.naoLidas}
          temMais={chatList.temMais}
          carregandoMais={chatList.carregandoMais}
          onBuscar={chatList.buscar}
          onFiltrarNaoLidas={chatList.filtrarNaoLidas}
          onSelecionar={onSelecionarConversa}
          onCarregarMais={chatList.carregarMais}
        />
      </div>

      {/* Coluna 2: Mensagens */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {conversaSelecionada ? (
          <>
            {/* Header mobile */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 sm:hidden">
              <button
                type="button"
                onClick={onVoltar}
                className="rounded-lg p-1.5 text-foreground-muted hover:bg-muted"
                aria-label="Voltar para a lista de conversas"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex-1 truncate text-sm font-medium text-foreground">
                {conversaSelecionada.leadNome}
              </span>
              <button
                type="button"
                onClick={onAlternarDados}
                className={cn(
                  "rounded-lg p-1.5 hover:bg-muted",
                  mostrarDadosCliente ? "bg-success/10 text-success" : "text-foreground-muted",
                )}
                aria-label={mostrarDadosCliente ? "Ocultar dados do cliente" : "Mostrar dados do cliente"}
              >
                <Info className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo: mensagens ou dados do cliente (mobile) */}
            {mostrarDadosCliente ? (
              <div className="flex-1 sm:hidden">
                <ChatClientPanel lead={leadDados} carregando={carregandoLead} />
              </div>
            ) : null}

            <div className={cn("flex min-h-0 flex-1 overflow-hidden", mostrarDadosCliente && "hidden sm:flex")}>
              <ChatMessagesPanel
                leadId={conversaSelecionada.leadId}
                leadNome={conversaSelecionada.leadNome}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground-disabled">Selecione uma conversa</p>
              <p className="mt-1 text-sm text-foreground-muted">Escolha um chat na lista para comecar</p>
            </div>
          </div>
        )}
      </div>

      {/* Coluna 3: Dados do cliente */}
      <div className="hidden min-h-0 w-[280px] shrink-0 overflow-hidden border-l border-border xl:block">
        <ChatClientPanel lead={leadDados} carregando={carregandoLead} />
      </div>
    </div>
  );
}
