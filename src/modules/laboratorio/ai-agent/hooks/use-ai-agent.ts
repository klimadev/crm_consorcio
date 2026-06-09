"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, AnalyzeRequest, AiConfig, LeadAnalysis } from "../types";

type ProviderConfigForm = {
  base_url: string;
  api_key: string;
  model: string;
  enabled: boolean;
};

export function useAiAgent() {
  const [config, setConfig] = useState<ProviderConfigForm | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingLeads, setSendingLeads] = useState<Set<string>>(new Set());
  const [sentLeads, setSentLeads] = useState<Set<string>>(new Set());

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/laboratorio/ai-agent/config");
      if (!res.ok) return null;
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        return data.config;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const saveConfig = useCallback(async (cfg: ProviderConfigForm) => {
    const res = await fetch("/api/dev/laboratorio/ai-agent/config/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ erro: "Erro ao salvar config" }));
      throw new Error(err.erro ?? "Erro ao salvar config");
    }
    setConfig(cfg);
  }, []);

  const testConnection = useCallback(async (cfg: ProviderConfigForm): Promise<boolean> => {
    const res = await fetch("/api/dev/laboratorio/ai-agent/config/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success ?? false;
  }, []);

  const listModels = useCallback(async (baseUrl: string, apiKey: string): Promise<string[]> => {
    const res = await fetch("/api/dev/laboratorio/ai-agent/config/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_url: baseUrl, api_key: apiKey }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models ?? [];
  }, []);

  const analyze = useCallback(async (request: AnalyzeRequest) => {
    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/dev/laboratorio/ai-agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ erro: "Erro ao analisar" }));
        throw new Error(err.erro ?? "Erro ao analisar conversas");
      }

      const data = await res.json();
      setAnalysisResult(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao analisar conversas";
      setError(msg);
      throw e;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const sendFollowUp = useCallback(async (
    instanceName: string,
    telefone: string,
    mensagem: string,
    leadName?: string,
  ) => {
    const key = `${instanceName}:${telefone}`;
    setSendingLeads((prev) => new Set(prev).add(key));

    try {
      const res = await fetch("/api/dev/laboratorio/ai-agent/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, telefone, mensagem, leadName }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ erro: "Erro ao enviar" }));
        throw new Error(err.erro ?? "Erro ao enviar mensagem");
      }

      setSentLeads((prev) => new Set(prev).add(key));
      return true;
    } finally {
      setSendingLeads((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const isSending = useCallback(
    (instanceName: string, telefone: string) =>
      sendingLeads.has(`${instanceName}:${telefone}`),
    [sendingLeads],
  );

  const isSent = useCallback(
    (instanceName: string, telefone: string) =>
      sentLeads.has(`${instanceName}:${telefone}`),
    [sentLeads],
  );

  return {
    config,
    analysisResult,
    analyzing,
    error,
    loadConfig,
    saveConfig,
    testConnection,
    listModels,
    analyze,
    sendFollowUp,
    isSending,
    isSent,
  };
}
