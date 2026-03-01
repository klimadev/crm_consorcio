"use client";

import { useEffect, useRef } from "react";
import type { ChatConnectionStatus, WhatsappChatMessage } from "@/modules/whatsapp/types";
import { WhatsappConnectionBadge } from "./whatsapp-connection-badge";
import { WhatsappMessageList } from "./whatsapp-message-list";
import { WhatsappMessageInput } from "./whatsapp-message-input";

type Props = {
  leadNome: string;
  messages: WhatsappChatMessage[];
  connectionStatus: ChatConnectionStatus;
  loading: boolean;
  sending: boolean;
  canSend: boolean;
  error: string | null;
  onSendMessage: (text: string) => Promise<void>;
  onRetryMessage: (message: WhatsappChatMessage) => Promise<void>;
};

export function WhatsappChatPanel({
  leadNome,
  messages,
  connectionStatus,
  loading,
  sending,
  canSend,
  error,
  onSendMessage,
  onRetryMessage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex h-[500px] flex-col overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between bg-emerald-600 px-4 py-3">
        <p className="truncate pr-3 text-sm font-semibold text-white">{leadNome}</p>
        <WhatsappConnectionBadge status={connectionStatus} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth bg-slate-50 px-3 py-3">
        <WhatsappMessageList messages={messages} loading={loading} onRetry={(message) => void onRetryMessage(message)} />
      </div>

      {error ? <p className="px-3 py-1 text-xs text-rose-600">{error}</p> : null}
      {!canSend ? <p className="px-3 pb-1 text-xs text-amber-700">WhatsApp desconectado.</p> : null}

      <WhatsappMessageInput disabled={!canSend} sending={sending} onSend={onSendMessage} />
    </div>
  );
}
