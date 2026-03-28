"use client";

import { useCallback, useState } from "react";
import type { ConversaResumo } from "../types";

export function useChatModule() {
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaResumo | null>(null);
  const [mostrarDadosCliente, setMostrarDadosCliente] = useState(false);

  const selecionarConversa = useCallback((conversa: ConversaResumo) => {
    setConversaSelecionada(conversa);
    setMostrarDadosCliente(false);
  }, []);

  const voltarParaLista = useCallback(() => {
    setConversaSelecionada(null);
    setMostrarDadosCliente(false);
  }, []);

  const alternarDadosCliente = useCallback(() => {
    setMostrarDadosCliente((prev) => !prev);
  }, []);

  return {
    conversaSelecionada,
    mostrarDadosCliente,
    selecionarConversa,
    voltarParaLista,
    alternarDadosCliente,
  };
}
