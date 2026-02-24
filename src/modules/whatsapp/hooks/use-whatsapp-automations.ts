"use client";

import { useEffect, useState, useCallback } from "react";
import type { WhatsappAutomacao, UseWhatsappAutomationsReturn } from "../types";

export function useWhatsappAutomations(): UseWhatsappAutomationsReturn {
  const [automacoes, setAutomacoes] = useState<WhatsappAutomacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarAutomacoes = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/whatsapp/automations");

      if (!resposta.ok) {
        const json = await resposta.json().catch(() => ({}));
        setErro(json.erro ?? "Erro ao carregar automações.");
        setAutomacoes([]);
        return;
      }

      const json = await resposta.json();
      setAutomacoes(json.automacoes ?? []);
    } catch {
      setErro("Erro ao conectar com o servidor.");
      setAutomacoes([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarAutomacoes();
  }, [carregarAutomacoes]);

  const criarAutomacao = useCallback(
    async (data: {
      id_whatsapp_instancia: string;
      evento: string;
      id_estagio_destino?: string;
      telefone_destino: string;
      mensagem: string;
      ativo?: boolean;
    }) => {
      setErro(null);

      try {
        const resposta = await fetch("/api/whatsapp/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const json = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          setErro(json.erro ?? "Erro ao criar automação.");
          return;
        }

        if (json.automacao) {
          setAutomacoes((atual) => [json.automacao, ...atual]);
        }
      } catch {
        setErro("Erro ao conectar com o servidor.");
      }
    },
    []
  );

  const alternarAutomacao = useCallback(async (id: string, ativo: boolean) => {
    const automacaoAnterior = automacoes.find((a) => a.id === id);
    if (!automacaoAnterior) return;

    setAutomacoes((atual) =>
      atual.map((a) => (a.id === id ? { ...a, ativo } : a))
    );

    try {
      const resposta = await fetch(`/api/whatsapp/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      });

      if (!resposta.ok) {
        setAutomacoes((atual) =>
          atual.map((a) => (a.id === id ? automacaoAnterior : a))
        );
        const json = await resposta.json().catch(() => ({}));
        setErro(json.erro ?? "Erro ao alternar automação.");
      }
    } catch {
      setAutomacoes((atual) =>
        atual.map((a) => (a.id === id ? automacaoAnterior : a))
      );
    }
  }, [automacoes]);

  const excluirAutomacao = useCallback(async (id: string) => {
    const automacaoAnterior = automacoes.find((a) => a.id === id);
    if (!automacaoAnterior) return;

    setAutomacoes((atual) => atual.filter((a) => a.id !== id));

    try {
      const resposta = await fetch(`/api/whatsapp/automations/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        setAutomacoes((atual) => [...atual, automacaoAnterior]);
        const json = await resposta.json().catch(() => ({}));
        setErro(json.erro ?? "Erro ao excluir automação.");
      }
    } catch {
      setAutomacoes((atual) => [...atual, automacaoAnterior]);
    }
  }, [automacoes]);

  return {
    automacoes,
    carregando,
    erro,
    criarAutomacao,
    alternarAutomacao,
    excluirAutomacao,
    recarregar: carregarAutomacoes,
  };
}
