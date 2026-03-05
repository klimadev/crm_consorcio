"use client";

import { useEffect, useState, useCallback } from "react";
import {
  atualizarAutomacaoWhatsapp,
  criarAutomacaoWhatsapp,
  dispararDispatchFollowUpWhatsapp,
  excluirAutomacaoWhatsapp,
  gerarPreviewAutomacaoWhatsapp,
  listarAutomacoesWhatsapp,
} from "@/lib/api/whatsapp";
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
      const resultado = await listarAutomacoesWhatsapp();

      if (!resultado.ok) {
        setErro(resultado.erro);
        setAutomacoes([]);
        return;
      }

      setAutomacoes(resultado.dados.automacoes);
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
        const resultado = await criarAutomacaoWhatsapp(data);

        if (!resultado.ok) {
          setErro(resultado.erro);
          return;
        }

        if (resultado.dados.automacao) {
          const automacao = resultado.dados.automacao;
          setAutomacoes((atual) => [automacao, ...atual]);
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
        const resultado = await atualizarAutomacaoWhatsapp(id, data);

        if (!resultado.ok) {
          setErro(resultado.erro);
          return;
        }

        if (resultado.dados.automacao) {
          const automacao = resultado.dados.automacao;
          setAutomacoes((atual) =>
            atual.map((a) => (a.id === id ? automacao : a))
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
      const resultado = await gerarPreviewAutomacaoWhatsapp(mensagem);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return null;
      }

      return resultado.dados.preview;
    } catch {
      setErro("Erro ao gerar preview.");
      return null;
    }
  }, []);

  const dispararDispatchFollowUp = useCallback(async (limite = 50): Promise<WhatsappFollowUpDispatchResultado | null> => {
    setErro(null);

    try {
      const resultado = await dispararDispatchFollowUpWhatsapp(limite);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return null;
      }

      return resultado.dados;
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
      const resultado = await atualizarAutomacaoWhatsapp(id, { ativo });

      if (!resultado.ok) {
        setAutomacoes((atual) =>
          atual.map((a) => (a.id === id ? automacaoAnterior : a))
        );
        setErro(resultado.erro);
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
      const resultado = await excluirAutomacaoWhatsapp(id);

      if (!resultado.ok) {
        setAutomacoes((atual) => [...atual, automacaoAnterior]);
        setErro(resultado.erro);
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
