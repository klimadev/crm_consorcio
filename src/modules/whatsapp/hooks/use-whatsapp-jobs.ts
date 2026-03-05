"use client";

import { useCallback, useEffect, useState } from "react";
import { listarJobsWhatsapp } from "@/lib/api/whatsapp";
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
      const resultado = await listarJobsWhatsapp();

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      setResumo({
        pendentes: resultado.dados.resumo.pendentes,
        processando: resultado.dados.resumo.processando,
        falhas: resultado.dados.resumo.falhas,
        enviadosHoje: resultado.dados.resumo.enviadosHoje,
        atualizadoEm: resultado.dados.resumo.atualizadoEm,
      });

      setJobs(
        resultado.dados.agendamentos.map((j: WhatsappJobItem) => ({
              ...j,
              agendado_para: j.agendado_para,
              criado_em: j.criado_em,
              enviado_em: j.enviado_em,
            }))
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
