"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assinarConversasWhatsapp } from "@/lib/api/whatsapp";
import type { ConversaResumo, ConversasResponse } from "../types";

async function fetchConversas(
  busca: string,
  cursor: string | null,
  apenasNaoLidas: boolean,
  signal?: AbortSignal,
): Promise<ConversasResponse> {
  const params = new URLSearchParams();
  if (busca) params.set("busca", busca);
  if (cursor) params.set("cursor", cursor);
  if (apenasNaoLidas) params.set("naoLidas", "true");
  params.set("limite", "30");

  const res = await fetch(`/api/whatsapp/chat/conversations?${params}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error("Erro ao carregar conversas");
  return res.json();
}

export function useChatList() {
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [naoLidas, setNaoLidas] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  const cursorRef = useRef<string | null>(null);

  const reiniciarStream = useCallback((buscaAtual: string, filtroNaoLidas: boolean) => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = assinarConversasWhatsapp(
      { busca: buscaAtual, naoLidas: filtroNaoLidas, limite: 30 },
      {
        onSnapshot: (dados) => {
          if (buscaRef.current !== buscaAtual) return;
          if (cursorRef.current !== null) return;
          setConversas(dados.conversas);
          setTemMais(dados.temMais);
          cursorRef.current = dados.cursor;
          setErro(null);
          setCarregando(false);
        },
        onError: () => undefined,
      },
    );
  }, []);

  const carregar = useCallback(async (buscaAtual: string, filtroNaoLidas: boolean, resetar = true) => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    if (resetar) setCarregando(true);
    setErro(null);

    try {
      const dados = await fetchConversas(
        buscaAtual,
        resetar ? null : cursorRef.current,
        filtroNaoLidas,
        controllerRef.current.signal,
      );
      if (buscaRef.current !== buscaAtual) return;

      setConversas((prev) => resetar ? dados.conversas : [...prev, ...dados.conversas]);
      cursorRef.current = dados.cursor;
      setTemMais(dados.temMais);
      if (resetar) {
        reiniciarStream(buscaAtual, filtroNaoLidas);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, [reiniciarStream]);

  const buscar = useCallback((termo: string) => {
    setBusca(termo);
    cursorRef.current = null;
    void carregar(termo, naoLidas, true);
  }, [carregar, naoLidas]);

  const filtrarNaoLidas = useCallback((ativo: boolean) => {
    setNaoLidas(ativo);
    cursorRef.current = null;
    void carregar(busca, ativo, true);
  }, [carregar, busca]);

  const carregarMais = useCallback(() => {
    if (!temMais || carregandoMais) return;
    setCarregandoMais(true);
    void carregar(busca, naoLidas, false);
  }, [temMais, carregandoMais, carregar, busca, naoLidas]);

  const recarregar = useCallback(() => {
    cursorRef.current = null;
    void carregar(busca, naoLidas, true);
  }, [carregar, busca, naoLidas]);

  useEffect(() => {
    void carregar("", false, true);
    return () => {
      controllerRef.current?.abort();
      unsubscribeRef.current?.();
    };
  }, [carregar]);

  return {
    conversas,
    carregando,
    erro,
    busca,
    buscar,
    naoLidas,
    filtrarNaoLidas,
    temMais,
    carregandoMais,
    carregarMais,
    recarregar,
  };
}
