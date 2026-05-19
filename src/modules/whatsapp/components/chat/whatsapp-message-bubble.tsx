import { useState } from "react";
import { Check, CheckCheck, Clock3, RotateCcw, Trash2, Volume2 } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";
import { formatarDataMensagemWhatsapp } from "@/lib/whatsapp-utils";
import { AudioMessageBubble } from "./audio-message-bubble";
import { ImageMessageBubble } from "./image-message-bubble";
import { DocumentMessageChip } from "./document-message-chip";
import { MediaLightbox } from "./media-lightbox";

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
  if (message.status === "PENDING") return <Clock3 className="h-3 w-3 text-foreground-muted" />;
  if (message.status === "SENT") return <Check className="h-3 w-3 text-foreground-muted" />;
  if (message.status === "DELIVERED") return <CheckCheck className="h-3 w-3 text-foreground-muted" />;
  if (message.status === "READ") return <CheckCheck className="h-3 w-3 text-info" />;
  if (message.status === "PLAYED") return <Volume2 className="h-3 w-3 text-success" />;
  if (message.status === "DELETED") return <Trash2 className="h-3 w-3 text-foreground-disabled" />;
  return null;
}

function isAudioMessage(message: WhatsappChatMessage): boolean {
  return message.kind === "audio";
}

function isImageMessage(message: WhatsappChatMessage): boolean {
  return message.kind === "image" || message.kind === "video" || message.kind === "sticker";
}

function isDocumentMessage(message: WhatsappChatMessage): boolean {
  return message.kind === "document";
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  if (isImageMessage(message)) {
    return (
      <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
        <ImageMessageBubble message={message} onClick={() => {
          // Lightbox só pode abrir com a URL já carregada — o componente ImageMessageBubble
          // gerencia isso internamente. Aqui apenas declaramos a intenção.
        }} />
      </div>
    );
  }

  if (isDocumentMessage(message)) {
    return (
      <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
        <DocumentMessageChip message={message} />
      </div>
    );
  }

  return (
    <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
      {lightboxSrc && <MediaLightbox src={lightboxSrc} alt={message.caption ?? "Imagem"} onClose={() => setLightboxSrc(null)} />}
      <div
        className={`max-w-[80%] px-3 py-2 shadow-sm text-[15px] leading-relaxed transition-all duration-200 hover:shadow-md hover:shadow-slate-200/50 ${
          outgoing
            ? "bg-success/10 rounded-br-none"
            : "bg-background-surface rounded-bl-none"
        } ${isDeleted ? "opacity-50" : ""}`}
        style={{
          borderRadius: outgoing ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        }}
      >
        {isDeleted ? (
          <p className="whitespace-pre-wrap text-sm text-foreground-muted italic">Mensagem excluída</p>
        ) : (
          <p className="whitespace-pre-wrap text-foreground">{message.text}</p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-foreground-muted">
          {message.status === "ERROR" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-destructive hover:text-destructive/90"
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
