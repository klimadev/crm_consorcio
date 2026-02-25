"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  WhatsappAutomacao,
  UseWhatsappAutomationsReturn,
  WhatsappAutomacaoCreateInput,
  WhatsappAutomacaoUpdateInput,
  WhatsappFollowUpDispatchResultado,
} from "../types";

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
    async (data: WhatsappAutomacaoCreateInput) => {
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

  const atualizarAutomacao = useCallback(
    async (id: string, data: WhatsappAutomacaoUpdateInput) => {
      setErro(null);
      const automacaoAnterior = automacoes.find((a) => a.id === id);
      if (!automacaoAnterior) return;

      try {
        const resposta = await fetch(`/api/whatsapp/automations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const json = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          setErro(json.erro ?? "Erro ao atualizar automação.");
          return;
        }

        if (json.automacao) {
          setAutomacoes((atual) =>
            atual.map((a) => (a.id === id ? json.automacao : a))
          );
        }
      } catch {
        setErro("Erro ao conectar com o servidor.");
      }
    },
    [automacoes]
  );

  const previewMensagem = useCallback(async (mensagem: string) => {
    try {
      const resposta = await fetch("/api/whatsapp/automations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem }),
      });

      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(json.erro ?? "Erro ao gerar preview.");
        return null;
      }

      return typeof json.preview === "string" ? json.preview : null;
    } catch {
      setErro("Erro ao gerar preview.");
      return null;
    }
  }, []);

  const dispararDispatchFollowUp = useCallback(async (limite = 50): Promise<WhatsappFollowUpDispatchResultado | null> => {
    setErro(null);

    try {
      const resposta = await fetch("/api/whatsapp/automations/follow-up/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limite }),
      });

      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        setErro(json.erro ?? "Erro ao processar follow-ups.");
        return null;
      }

      return {
        runId: typeof json.runId === "string" ? json.runId : "dispatch-sem-id",
        processados: typeof json.processados === "number" ? json.processados : 0,
        enviados: typeof json.enviados === "number" ? json.enviados : 0,
        falhas: typeof json.falhas === "number" ? json.falhas : 0,
        detalhes: Array.isArray(json.detalhes) ? json.detalhes : [],
      };
    } catch {
      setErro("Erro ao processar follow-ups.");
      return null;
    }
  }, []);

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
    atualizarAutomacao,
    previewMensagem,
    dispararDispatchFollowUp,
    alternarAutomacao,
    excluirAutomacao,
    recarregar: carregarAutomacoes,
  };
}
