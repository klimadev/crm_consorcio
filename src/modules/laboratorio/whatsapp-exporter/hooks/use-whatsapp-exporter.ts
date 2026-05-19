"use client";

import { useState, useEffect, useCallback } from "react";
import type { WhatsappInstancia } from "@/modules/whatsapp/types";
import type { ExportConfig, ExportResultado } from "../types";

const CONFIG_PADRAO: ExportConfig = {
  chatLimit: 500,
  messagesPerChat: 30,
};

export function useWhatsappExporter() {
  const [instances, setInstances] = useState<WhatsappInstancia[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [config, setConfig] = useState<ExportConfig>(CONFIG_PADRAO);
  const [resultados, setResultados] = useState<ExportResultado[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoInstancias, setCarregandoInstancias] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarInstancias() {
      try {
        const resposta = await fetch("/api/whatsapp/instances");
        if (!resposta.ok) {
          const erro = await resposta.json().catch(() => ({}));
          throw new Error(erro.erro ?? "Erro ao carregar instâncias");
        }
        const dados = await resposta.json();
        if (ativo) {
          setInstances(dados.instancias ?? []);
        }
      } catch (erro) {
        if (ativo) {
          setErroCarregamento(
            erro instanceof Error ? erro.message : "Erro ao carregar instâncias",
          );
        }
      } finally {
        if (ativo) {
          setCarregandoInstancias(false);
        }
      }
    }

    carregarInstancias();

    return () => {
      ativo = false;
    };
  }, []);

  const toggleInstancia = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const atualizarConfig = useCallback((parcial: Partial<ExportConfig>) => {
    setConfig((prev) => ({ ...prev, ...parcial }));
  }, []);

  const exportar = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    setResultados([]);

    try {
      const resposta = await fetch("/api/dev/whatsapp-exporter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceIds: selectedIds,
          ...config,
        }),
      });

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(erro.erro ?? "Erro ao exportar");
      }

      const dados = await resposta.json();
      setResultados(dados.resultados ?? []);
    } catch (erro) {
      setResultados([
        {
          instanceId: "",
          instanceName: "",
          instanceLabel: "Erro",
          status: "erro",
          dump: null,
          stats: null,
          erro:
            erro instanceof Error ? erro.message : "Erro ao exportar conversas",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedIds, config]);

  return {
    instances,
    selectedIds,
    config,
    resultados,
    loading,
    carregandoInstancias,
    erroCarregamento,
    toggleInstancia,
    atualizarConfig,
    exportar,
  };
}
