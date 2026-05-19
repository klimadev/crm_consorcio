"use client";

import { useCallback, useState } from "react";
import { FileText, Loader2, AlertCircle, Download } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";

const cache = new Map<string, string>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const requestsEmVoo = new Map<string, Promise<string | null>>();

async function buscarBase64Documento(
  leadId: string,
  messageId: string,
  signal: AbortSignal,
): Promise<string | null> {
  const cacheKey = `doc:${leadId}:${messageId}`;
  const existente = cache.get(cacheKey);
  if (existente) return existente;

  const emVoo = requestsEmVoo.get(cacheKey);
  if (emVoo) return emVoo;

  const promise = (async () => {
    try {
      const url = `/api/whatsapp/chat/media?leadId=${encodeURIComponent(leadId)}&messageId=${encodeURIComponent(messageId)}`;
      const resposta = await fetch(url, { signal });
      if (!resposta.ok) return null;
      const json = await resposta.json();
      if (json.media?.base64) {
        cache.set(cacheKey, json.media.base64);
        setTimeout(() => cache.delete(cacheKey), CACHE_TTL_MS);
        return json.media.base64 as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      requestsEmVoo.delete(cacheKey);
    }
  })();

  requestsEmVoo.set(cacheKey, promise);
  return promise;
}

function baixarArquivoBase64(base64: string, fileName: string, mimeType: string) {
  const byteChars = atob(base64.replace(/\s/g, ""));
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const iconePorExtensao: Record<string, typeof FileText> = {};

function iconeDocumento(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const IconComponent = iconePorExtensao[ext] ?? FileText;
  return <IconComponent className="h-4 w-4 text-foreground-muted" />;
}

function formatarTamanhoBase64(base64: string) {
  const bytes = Math.round((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  message: WhatsappChatMessage;
};

export function DocumentMessageChip({ message }: Props) {
  const [estado, setEstado] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [base64, setBase64] = useState<string | null>(null);
  const fileName = message.fileName ?? "documento";
  const mimeType = message.mimeType ?? "application/octet-stream";

  const handleDownload = useCallback(async () => {
    if (estado === "ready" && base64) {
      baixarArquivoBase64(base64, fileName, mimeType);
      return;
    }
    if (estado === "idle") {
      setEstado("loading");
      try {
        const controller = new AbortController();
        const b64 = await buscarBase64Documento(message.leadId, message.messageId, controller.signal);
        if (!b64) {
          setEstado("error");
          return;
        }
        setBase64(b64);
        setEstado("ready");
        baixarArquivoBase64(b64, fileName, mimeType);
      } catch {
        setEstado("error");
      }
    }
  }, [estado, base64, message.leadId, message.messageId, fileName, mimeType]);

  const tamanho = base64 ? formatarTamanhoBase64(base64) : "";

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-background-surface px-3 py-2.5 max-w-[280px]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
        {estado === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
        ) : estado === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          iconeDocumento(fileName)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
        <p className="text-xs text-foreground-muted">
          {(tamanho || mimeType.split("/").pop()?.toUpperCase()) ?? "Arquivo"}
        </p>
      </div>
      <button
        type="button"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
        onClick={handleDownload}
        aria-label={`Baixar ${fileName}`}
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}
