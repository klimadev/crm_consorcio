import { Check, CheckCheck, Clock3, RotateCcw, Trash2, Volume2 } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";
import { formatarDataMensagemWhatsapp } from "@/lib/whatsapp-utils";
import { AudioMessageBubble } from "./audio-message-bubble";

type Props = {
  message: WhatsappChatMessage;
  onRetry?: (message: WhatsappChatMessage) => void;
  onAudioEnded?: (message: WhatsappChatMessage) => void;
  autoPlayRequested?: boolean;
  autoPlaySequence?: number | null;
};

function formatTime(timestamp: number) {
  return formatarDataMensagemWhatsapp(timestamp);
}

function ReceiptIcon({ message }: { message: WhatsappChatMessage }) {
  if (!message.fromMe) return null;
  if (message.status === "PENDING") return <Clock3 className="h-3 w-3 text-slate-500" />;
  if (message.status === "SENT") return <Check className="h-3 w-3 text-slate-500" />;
  if (message.status === "DELIVERED") return <CheckCheck className="h-3 w-3 text-slate-500" />;
  if (message.status === "READ") return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (message.status === "PLAYED") return <Volume2 className="h-3 w-3 text-purple-500" />;
  if (message.status === "DELETED") return <Trash2 className="h-3 w-3 text-slate-400" />;
  return null;
}

function isAudioMessage(message: WhatsappChatMessage): boolean {
  return message.kind === "audio";
}

export function WhatsappMessageBubble({
  message,
  onRetry,
  onAudioEnded,
  autoPlayRequested,
  autoPlaySequence,
}: Props) {
  const outgoing = message.fromMe;
  const isDeleted = message.status === "DELETED";

  if (isAudioMessage(message)) {
    return (
      <AudioMessageBubble
        message={message}
        autoPlayRequested={autoPlayRequested}
        autoPlaySequence={autoPlaySequence}
        onEnded={() => onAudioEnded?.(message)}
      />
    );
  }

  return (
    <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 shadow-sm text-[15px] leading-relaxed transition-all duration-200 hover:shadow-md hover:shadow-slate-200/50 ${
          outgoing
            ? "bg-[#d9fdd3] rounded-br-none"
            : "bg-white rounded-bl-none"
        } ${isDeleted ? "opacity-50" : ""}`}
        style={{
          borderRadius: outgoing ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        {isDeleted ? (
          <p className="whitespace-pre-wrap text-sm text-slate-400 italic">Mensagem excluída</p>
        ) : (
          <p className="whitespace-pre-wrap text-slate-800">{message.text}</p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {message.status === "ERROR" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
              onClick={() => onRetry?.(message)}
            >
              <RotateCcw className="h-3 w-3" />
              Falhou
            </button>
          ) : (
            <>
              <span>{formatTime(message.timestamp)}</span>
              <ReceiptIcon message={message} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
