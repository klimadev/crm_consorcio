import { Check, CheckCheck, Clock3, RotateCcw, Trash2, Volume2 } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";

type Props = {
  message: WhatsappChatMessage;
  onRetry?: (message: WhatsappChatMessage) => void;
};

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function WhatsappMessageBubble({ message, onRetry }: Props) {
  const outgoing = message.fromMe;
  const isDeleted = message.status === "DELETED";
  return (
    <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 shadow-sm ${
          outgoing
            ? "rounded-2xl rounded-tr-none bg-emerald-100"
            : "rounded-2xl rounded-tl-none bg-white"
        } ${isDeleted ? "opacity-50" : ""}`}
      >
        {isDeleted ? (
          <p className="whitespace-pre-wrap text-sm text-slate-400 line-through">Mensagem excluída</p>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-800">{message.text}</p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
          {message.status === "ERROR" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700"
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
