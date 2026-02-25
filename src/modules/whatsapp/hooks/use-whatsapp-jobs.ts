"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseWhatsappJobsReturn, WhatsappJobsResumo, WhatsappJobItem } from "../types";

const RESUMO_INICIAL: WhatsappJobsResumo = {
  pendentes: 0,
  processando: 0,
  falhas: 0,
  enviadosHoje: 0,
  atualizadoEm: "",
};

export function useWhatsappJobs(): UseWhatsappJobsReturn {
  const [resumo, setResumo] = useState<WhatsappJobsResumo>(RESUMO_INICIAL);
  const [jobs, setJobs] = useState<WhatsappJobItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/whatsapp/agendamentos?lista=true&limite=50");
      const json = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setErro(json.erro ?? "Erro ao carregar jobs do WhatsApp.");
        return;
      }

      setResumo({
        pendentes: typeof json.resumo?.pendentes === "number" ? json.resumo.pendentes : 0,
        processando: typeof json.resumo?.processando === "number" ? json.resumo.processando : 0,
        falhas: typeof json.resumo?.falhas === "number" ? json.resumo.falhas : 0,
        enviadosHoje: typeof json.resumo?.enviadosHoje === "number" ? json.resumo.enviadosHoje : 0,
        atualizadoEm: typeof json.resumo?.atualizadoEm === "string" ? json.resumo.atualizadoEm : "",
      });

      setJobs(
        Array.isArray(json.agendamentos)
          ? json.agendamentos.map((j: WhatsappJobItem) => ({
              ...j,
              agendado_para: j.agendado_para,
              criado_em: j.criado_em,
              enviado_em: j.enviado_em,
            }))
          : []
      );
      setErro(null);
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();

    const intervalo = setInterval(() => {
      void recarregar();
    }, 5000);

    return () => clearInterval(intervalo);
  }, [recarregar]);

  return {
    resumo,
    jobs,
    carregando,
    erro,
    recarregar,
  };
}
