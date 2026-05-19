"use client";

import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";

type Props = {
  leadId: string;
  leadNome: string;
};

export function ChatMessagesPanel({ leadId, leadNome }: Props) {
  const chat = useWhatsappChat({
    leadId,
    enabled: Boolean(leadId),
    markReadEnabled: true,
    pollMs: 30000,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[chat-messages-panel]", {
      leadId,
      mensagens: chat.messages.length,
      loading: chat.loading,
      connectionStatus: chat.connectionStatus,
      blocked: Boolean(chat.blockedState),
    });
  }

  return (
    <WhatsappChatPanel
      leadNome={leadNome}
      messages={chat.messages}
      connectionStatus={chat.connectionStatus}
      loading={chat.loading}
      sending={chat.sending}
      canSend={chat.canSend}
      error={chat.error}
      blockedState={chat.blockedState}
      onSendMessage={chat.sendMessage}
      onSendMedia={chat.sendMedia}
      onSendAudio={chat.sendAudio}
      onRetryMessage={chat.retryMessage}
    />
  );
}
