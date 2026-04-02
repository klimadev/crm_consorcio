"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Perfil } from "@/lib/tipos";
import type { LeadDadosChat } from "./types";
import { useChatList } from "./hooks/use-chat-list";
import { useChatModule } from "./hooks/use-chat-module";
import { ChatLayout } from "./components/chat-layout";

type ModuloChatProps = {
  perfil: Perfil;
  idUsuario: string;
};

export function ModuloChat({ perfil, idUsuario }: ModuloChatProps) {
  const chatList = useChatList();
  const modulo = useChatModule();
  const [leadDados, setLeadDados] = useState<LeadDadosChat | null>(null);
  const [carregandoLead, setCarregandoLead] = useState(false);
  const leadControllerRef = useRef<AbortController | null>(null);
  const leadRequestIdRef = useRef(0);

  useEffect(() => {
    console.log("[chat] estado", {
      conversaSelecionada: modulo.conversaSelecionada?.leadId ?? null,
      carregandoLead,
      leadDados: leadDados?.id ?? null,
      conversas: chatList.conversas.length,
    });
  }, [modulo.conversaSelecionada, carregandoLead, leadDados, chatList.conversas.length]);

  useEffect(() => {
    if (!leadDados) return;

    console.log("[chat] lead dados", {
      id: leadDados.id,
      parcelas: leadDados.parcelas.length,
      temEstagio: Boolean(leadDados.estagio),
      temFuncionario: Boolean(leadDados.funcionario),
    });
  }, [leadDados]);

  const carregarDadosLead = useCallback(async (leadId: string) => {
    const requestId = ++leadRequestIdRef.current;
    leadControllerRef.current?.abort();
    leadControllerRef.current = new AbortController();

    setCarregandoLead(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        cache: "no-store",
        signal: leadControllerRef.current.signal,
      });
      if (!res.ok) return;

      const dados = await res.json();
      if (requestId !== leadRequestIdRef.current) return;

      setLeadDados(dados);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== leadRequestIdRef.current) return;
      // silencioso - painel mostra estado neutro
    } finally {
      if (requestId === leadRequestIdRef.current) {
        setCarregandoLead(false);
      }
    }
  }, []);

  useEffect(() => {
    if (modulo.conversaSelecionada) {
      void carregarDadosLead(modulo.conversaSelecionada.leadId);
    } else {
      setLeadDados(null);
      setCarregandoLead(false);
    }
    return () => leadControllerRef.current?.abort();
  }, [modulo.conversaSelecionada, carregarDadosLead]);

  return (
    <section className="flex min-h-0 flex-1 overflow-hidden lg:h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)] lg:py-0">
      <ChatLayout
        conversaSelecionada={modulo.conversaSelecionada}
        mostrarDadosCliente={modulo.mostrarDadosCliente}
        chatList={chatList}
        leadDados={leadDados}
        carregandoLead={carregandoLead}
        onSelecionarConversa={modulo.selecionarConversa}
        onVoltar={modulo.voltarParaLista}
        onAlternarDados={modulo.alternarDadosCliente}
      />
    </section>
  );
}
