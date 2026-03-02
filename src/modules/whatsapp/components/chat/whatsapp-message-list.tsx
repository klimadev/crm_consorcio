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
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 py-8">
        <div className="h-16 w-16 rounded-full bg-[#00a884]/10 flex items-center justify-center">
          <MessageCircleMore className="h-8 w-8 text-[#00a884]" />
        </div>
        <p className="text-sm font-medium text-slate-600">Nenhuma mensagem ainda</p>
        <p className="text-xs text-slate-400 text-center max-w-[200px]">
          Envie uma mensagem para começar a conversa
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((message) => (
        <WhatsappMessageBubble key={message.messageId || message.id} message={message} onRetry={onRetry} />
      ))}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce mx-1" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-[#00a884] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}
