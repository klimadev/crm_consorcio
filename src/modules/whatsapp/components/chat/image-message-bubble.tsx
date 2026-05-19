"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Maximize2 } from "lucide-react";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";

const cache = new Map<string, string>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const requestsEmVoo = new Map<string, Promise<string | null>>();

async function buscarBase64Imagem(
  leadId: string,
  messageId: string,
  signal: AbortSignal,
): Promise<string | null> {
  const cacheKey = `${leadId}:${messageId}`;
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

type Props = {
  message: WhatsappChatMessage;
  onClick?: () => void;
};

export function ImageMessageBubble({ message, onClick }: Props) {
  const mountedRef = useRef(true);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; src: string | null }>({
    status: "loading",
    src: null,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let retries = 0;
    const controller = new AbortController();

    const attemptFetch = () => {
      buscarBase64Imagem(message.leadId, message.messageId, controller.signal)
        .then((base64) => {
          if (!mountedRef.current) return;
          if (base64) {
            setState({ status: "ready", src: `data:image/jpeg;base64,${base64}` });
          } else if (retries < 2) {
            retries += 1;
            setTimeout(attemptFetch, 1000);
          } else {
            setState({ status: "error", src: null });
          }
        })
        .catch(() => {
          if (!mountedRef.current) return;
          if (retries < 2) {
            retries += 1;
            setTimeout(attemptFetch, 1000);
          } else {
            setState({ status: "error", src: null });
          }
        });
    };

    attemptFetch();

    return () => { controller.abort(); };
  }, [message.leadId, message.messageId]);

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Erro ao carregar imagem
      </div>
    );
  }

  if (state.status === "loading" || !state.src) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-muted px-4 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="relative inline-block max-w-[280px] cursor-pointer group" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.src}
        alt={message.caption ?? "Imagem"}
        className="w-full max-w-[280px] rounded-lg object-cover"
        style={{ maxHeight: "400px" }}
      />
      {message.caption && (
        <p className="mt-1 text-[13px] text-foreground">{message.caption}</p>
      )}
      <div className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
