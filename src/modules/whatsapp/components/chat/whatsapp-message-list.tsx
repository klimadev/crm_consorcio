import { MessageCircleMore } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";
import { WhatsappMessageBubble } from "./whatsapp-message-bubble";

type Props = {
  messages: WhatsappChatMessage[];
  loading: boolean;
  onRetry: (message: WhatsappChatMessage) => void;
};

export function WhatsappMessageList({ messages, loading, onRetry }: Props) {
  if (!loading && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
        <MessageCircleMore className="h-8 w-8" />
        <p className="text-sm">Nenhuma mensagem ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <WhatsappMessageBubble key={message.messageId || message.id} message={message} onRetry={onRetry} />
      ))}
      {loading && <p className="text-center text-xs text-slate-400">Atualizando conversa...</p>}
    </div>
  );
}
