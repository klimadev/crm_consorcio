"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { enviarMensagemWhatsapp, listarMensagensWhatsapp, marcarMensagensComoLidas } from "@/lib/api/whatsapp";
import type { ChatConnectionStatus, ChatMessageStatus, WhatsappChatBlockedState, WhatsappChatMessage } from "@/modules/whatsapp/types";

type UseWhatsappChatParams = {
  leadId?: string;
  enabled: boolean;
  markReadEnabled: boolean;
  pollMs?: number;
};

const statusWeight: Record<ChatMessageStatus, number> = {
  ERROR: 5,
  READ: 4,
  PLAYED: 4,
  DELIVERED: 3,
  DELETED: 3,
  SENT: 2,
  PENDING: 1,
};

function mergeMessages(base: WhatsappChatMessage[], incoming: WhatsappChatMessage[]) {
  const map = new Map<string, WhatsappChatMessage>();
  for (const message of [...base, ...incoming]) {
    const key = message.messageId || message.id;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, message);
      continue;
    }

    const stronger = statusWeight[message.status] >= statusWeight[existing.status] ? message.status : existing.status;
    map.set(key, {
      ...existing,
      ...message,
      status: stronger,
      optimistic: existing.optimistic && message.optimistic,
      error: message.error ?? existing.error,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function useWhatsappChat({ leadId, enabled, markReadEnabled, pollMs = 30000 }: UseWhatsappChatParams) {
  const [messages, setMessages] = useState<WhatsappChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>("unknown");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedState, setBlockedState] = useState<WhatsappChatBlockedState | null>(null);
  const backoffMsRef = useRef(pollMs);
  const messagesRef = useRef<WhatsappChatMessage[]>([]);

  const mountedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const markReadInFlightRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!enabled || !leadId) return;
    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;

    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;

    if (mountedRef.current) {
      setLoading((prev) => prev || messagesRef.current.length === 0);
      setError(null);
    }

    try {
      const resultado = await listarMensagensWhatsapp(leadId, signal);
      if (!resultado.ok) {
        if (resultado.codigo === "PDV_SEM_INSTANCIA") {
          setBlockedState({
            type: "missing_pdv_instance",
            message: resultado.erro,
            actionLabel: resultado.rotaConfiguracao ? "Configurar WhatsApp deste PDV" : undefined,
            actionHref: resultado.rotaConfiguracao ?? undefined,
          });
          setConnectionStatus("unknown");
          setMessages([]);
          setUnreadCount(0);
          return;
        }
        throw new Error(resultado.erro);
      }
      if (!mountedRef.current || currentSeq !== requestSeqRef.current) return;

      setBlockedState(null);
      setMessages((prev) => mergeMessages(prev, resultado.dados.messages));
      setConnectionStatus(resultado.dados.connectionStatus);
      setUnreadCount(resultado.dados.unreadCount);
      backoffMsRef.current = pollMs;
    } catch (err) {
      if (!mountedRef.current || signal.aborted) return;
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagens.");
      backoffMsRef.current = Math.max(pollMs, 30000);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      if (enabled) {
        const delay = document.visibilityState === "hidden" ? Math.max(backoffMsRef.current, 30000) : backoffMsRef.current;
        timeoutRef.current = setTimeout(() => {
          void fetchMessages();
        }, delay);
      }
    }
  }, [enabled, leadId, pollMs]);

  const reload = useCallback(async () => {
    stopPolling();
    await fetchMessages();
  }, [fetchMessages, stopPolling]);

  const sendMessage = useCallback(
    async (text: string, retryId?: string) => {
      if (!leadId || !enabled) return;

      const normalizedText = text.trim();
      if (!normalizedText) return;

      const tempId = retryId ?? `temp-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const optimisticMessage: WhatsappChatMessage = {
        id: tempId,
        messageId: tempId,
        leadId,
        remoteJid: "",
        remoteJidAlt: null,
        fromMe: true,
        direction: "outgoing",
        text: normalizedText,
        kind: "text",
        tipoLabel: "Texto",
        status: "PENDING",
        timestamp,
        timestampIso: new Date().toISOString(),
        createdAtIso: new Date().toISOString(),
        readAtIso: null,
        optimistic: true,
        error: null,
        dadosAd: null,
      };

      setError(null);
      setSending(true);
      setMessages((prev) => {
        const withoutRetry = retryId ? prev.filter((msg) => msg.id !== retryId) : prev;
        return mergeMessages(withoutRetry, [optimisticMessage]);
      });

      try {
        const resultado = await enviarMensagemWhatsapp({
          leadId,
          text: normalizedText,
          clientTempId: tempId,
        });

        if (!resultado.ok) {
          if (resultado.codigo === "PDV_SEM_INSTANCIA") {
            setBlockedState({
              type: "missing_pdv_instance",
              message: resultado.erro,
              actionLabel: resultado.rotaConfiguracao ? "Configurar WhatsApp deste PDV" : undefined,
              actionHref: resultado.rotaConfiguracao ?? undefined,
            });
          }
          throw new Error(resultado.erro);
        }

        setBlockedState(null);
        const serverMessage = resultado.dados.message;

        setMessages((prev) => {
          const replaced = prev.map((message) =>
            message.id === (resultado.dados.clientTempId ?? tempId) ? { ...serverMessage, optimistic: false } : message,
          );
          return mergeMessages(replaced, [serverMessage]);
        });
      } catch (err) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId
              ? {
                  ...message,
                  status: "ERROR",
                  error: err instanceof Error ? err.message : "Erro ao enviar mensagem.",
                  optimistic: false,
                }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [leadId, enabled],
  );

  const retryMessage = useCallback(
    async (message: WhatsappChatMessage) => {
      await sendMessage(message.text, message.id);
    },
    [sendMessage],
  );

  const markRead = useCallback(async () => {
    if (!leadId || !markReadEnabled || markReadInFlightRef.current) return;
    markReadInFlightRef.current = true;
    try {
      const resultado = await marcarMensagensComoLidas(leadId);
      if (resultado.ok && mountedRef.current) {
        setUnreadCount(resultado.dados.unreadCount);
        setMessages((prev) =>
          prev.map((message) =>
            !message.fromMe && !message.readAtIso
              ? {
                  ...message,
                  readAtIso: new Date().toISOString(),
                }
              : message,
          ),
        );
      }
    } finally {
      markReadInFlightRef.current = false;
    }
  }, [leadId, markReadEnabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    const isSameLead = Boolean(leadId) && messagesRef.current[0]?.leadId === leadId;

    if (!isSameLead) {
      setMessages([]);
      setUnreadCount(0);
    }
    setError(null);
    setBlockedState(null);
    backoffMsRef.current = pollMs;

    if (!enabled || !leadId) {
      stopPolling();
      return;
    }

    void fetchMessages();
    return () => {
      stopPolling();
    };
  }, [enabled, leadId, pollMs, fetchMessages, stopPolling]);

  useEffect(() => {
    if (!markReadEnabled || unreadCount <= 0) return;
    void markRead();
  }, [markReadEnabled, unreadCount, markRead]);

  const canSend = useMemo(() => enabled && Boolean(leadId) && connectionStatus === "online", [connectionStatus, enabled, leadId]);

  return {
    messages,
    connectionStatus,
    unreadCount,
    loading,
    sending,
    error,
    blockedState,
    canSend,
    sendMessage,
    retryMessage,
    markRead,
    reload,
  };
}
