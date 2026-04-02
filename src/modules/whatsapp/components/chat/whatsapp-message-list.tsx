import { useCallback, useMemo, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";
import { WhatsappMessageBubble } from "./whatsapp-message-bubble";
import { formatarLabelSeparadorData } from "@/lib/whatsapp-utils";

type Props = {
  messages: WhatsappChatMessage[];
  loading: boolean;
  onRetry: (message: WhatsappChatMessage) => void;
};

type AutoPlayRequest = {
  messageId: string;
  sequence: number;
} | null;

function getMessageKey(message: WhatsappChatMessage) {
  return message.messageId || message.id;
}

/**
 * Agrupa mensagens por dia para adicionar separadores
 */
function groupMessagesByDate(messages: WhatsappChatMessage[]): Array<{
  dateLabel: string;
  messages: WhatsappChatMessage[];
}> {
  const groups: Map<string, WhatsappChatMessage[]> = new Map();

  for (const message of messages) {
    // Usar timestamp da mensagem
    const timestamp = message.timestamp;
    const date = new Date(timestamp * 1000);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  }

  // Converter para array de grupos
  const result: Array<{ dateLabel: string; messages: WhatsappChatMessage[] }> = [];

  // Ordenar chaves de data
  const sortedKeys = Array.from(groups.keys()).sort();

  for (const dateKey of sortedKeys) {
    const msgs = groups.get(dateKey)!;
    // Usar timestamp da primeira mensagem do grupo para label
    const firstMsgTimestamp = msgs[0].timestamp;
    result.push({
      dateLabel: formatarLabelSeparadorData(firstMsgTimestamp),
      messages: msgs,
    });
  }

  return result;
}

export function WhatsappMessageList({ messages, loading, onRetry }: Props) {
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);
  const [autoPlayRequest, setAutoPlayRequest] = useState<AutoPlayRequest>(null);

  const audioMessageIds = useMemo(
    () => messages.filter((message) => message.kind === "audio").map(getMessageKey),
    [messages],
  );

  const nextAudioMessageById = useMemo(() => {
    const map = new Map<string, string>();

    audioMessageIds.forEach((messageId, index) => {
      const nextMessageId = audioMessageIds[index + 1];
      if (nextMessageId) {
        map.set(messageId, nextMessageId);
      }
    });

    return map;
  }, [audioMessageIds]);

  const effectiveAutoPlayRequest = useMemo(() => {
    if (!autoPlayRequest) return null;
    return messages.some((message) => getMessageKey(message) === autoPlayRequest.messageId) ? autoPlayRequest : null;
  }, [autoPlayRequest, messages]);

  const handleAudioEnded = useCallback(
    (message: WhatsappChatMessage) => {
      const nextMessageId = nextAudioMessageById.get(getMessageKey(message));

      if (!nextMessageId) {
        setAutoPlayRequest(null);
        return;
      }

      setAutoPlayRequest((current) => ({
        messageId: nextMessageId,
        sequence: (current?.sequence ?? 0) + 1,
      }));
    },
    [nextAudioMessageById],
  );

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
    <div className="space-y-2">
      {groupedMessages.map((group) => (
        <div key={group.dateLabel}>
          {/* Separador de data estilo WhatsApp */}
          <div className="flex items-center justify-center my-3">
            <div className="bg-[#e5ded8] px-3 py-1 rounded-lg">
              <span className="text-[11px] text-[#54656f] font-medium">
                {group.dateLabel}
              </span>
            </div>
          </div>
          {/* Mensagens do dia */}
          <div className="space-y-1">
            {group.messages.map((message) => (
              <WhatsappMessageBubble
                key={message.messageId || message.id}
                message={message}
                onRetry={onRetry}
                onAudioEnded={handleAudioEnded}
                autoPlayRequested={effectiveAutoPlayRequest?.messageId === message.messageId}
                autoPlaySequence={effectiveAutoPlayRequest?.messageId === message.messageId ? effectiveAutoPlayRequest.sequence : null}
              />
            ))}
          </div>
        </div>
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
