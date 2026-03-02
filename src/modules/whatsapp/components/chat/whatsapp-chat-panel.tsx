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
  blockedReason?: string | null;
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
  blockedReason,
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
    <div className="flex flex-col h-full bg-gradient-to-b from-[#075e54] to-[#128c7e]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#00a884]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
            {leadNome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{leadNome}</p>
            <p className="text-xs text-white/80">Online</p>
          </div>
        </div>
        <WhatsappConnectionBadge status={connectionStatus} />
      </div>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto scroll-smooth bg-[#e5ded8] p-3"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(0,0,0,0.05), transparent)
          `,
          backgroundSize: '20px 20px, 100% 100%'
        }}
      >
        <WhatsappMessageList 
          messages={messages} 
          loading={loading} 
          onRetry={(message) => void onRetryMessage(message)} 
        />
      </div>

      <div className="bg-[#f0f2f5] px-3 py-2">
        {error && (
          <p className="px-3 py-1 text-xs text-rose-600 bg-rose-50 rounded-lg mb-2">{error}</p>
        )}
        {blockedReason && (
          <p className="px-3 py-1 text-xs text-amber-700 bg-amber-50 rounded-lg mb-2">{blockedReason}</p>
        )}
        {!blockedReason && !canSend && (
          <p className="px-3 py-1 text-xs text-amber-700 bg-amber-50 rounded-lg mb-2">WhatsApp desconectado.</p>
        )}
      </div>

      <WhatsappMessageInput disabled={Boolean(blockedReason) || !canSend} sending={sending} onSend={onSendMessage} />
    </div>
  );
}
