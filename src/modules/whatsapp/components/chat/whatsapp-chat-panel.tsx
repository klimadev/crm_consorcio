"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MessageCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatConnectionStatus, WhatsappChatBlockedState, WhatsappChatMessage } from "@/modules/whatsapp/types";
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
  blockedState?: WhatsappChatBlockedState | null;
  onSendMessage: (text: string) => Promise<void>;
  onSendMedia: (file: File, caption?: string) => Promise<void>;
  onSendAudio: (blob: Blob, duration: number) => Promise<void>;
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
  blockedState,
  onSendMessage,
  onSendMedia,
  onSendAudio,
  onRetryMessage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between bg-success px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-foreground/15 font-semibold text-success-foreground">
            {leadNome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-success-foreground">{leadNome}</p>
            <p className="text-xs text-success-foreground/80">Canal ativo</p>
          </div>
        </div>
        <WhatsappConnectionBadge status={connectionStatus} />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent bg-muted p-3"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(0,0,0,0.05), transparent)
          `,
          backgroundSize: "20px 20px, 100% 100%",
        }}
      >
        <WhatsappMessageList
          messages={messages}
          loading={loading}
          onRetry={(message) => void onRetryMessage(message)}
        />
      </div>

      <div className="border-t border-border bg-background-surface px-3 py-2">
        {error && (
          <p className="mb-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs text-destructive">{error}</p>
        )}
        {blockedState && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2">
            <p className="text-xs text-warning">{blockedState.message}</p>
            {blockedState.actionHref ? (
              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-warning/30 bg-background-surface text-warning hover:bg-warning/10">
                <Link href={blockedState.actionHref}>
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  {blockedState.actionLabel ?? "Configurar"}
                </Link>
              </Button>
            ) : null}
          </div>
        )}
        {!blockedState && !canSend && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2">
            <p className="text-xs text-warning">Canal indisponivel.</p>
            <Button asChild size="sm" variant="outline" className="h-7 rounded-lg border-warning/30 bg-background-surface text-warning hover:bg-warning/10 text-xs">
              <Link href="/whatsapp">
                <MessageCircle className="mr-1 h-3.5 w-3.5" />
                Conectar
              </Link>
            </Button>
          </div>
        )}
      </div>

      <WhatsappMessageInput disabled={Boolean(blockedState) || !canSend} sending={sending} onSend={onSendMessage} onSendMedia={onSendMedia} onSendAudio={onSendAudio} />
    </div>
  );
}
