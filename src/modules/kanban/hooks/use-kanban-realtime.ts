"use client";

import { useCallback, useEffect, useRef } from "react";
import { listarKanban } from "@/lib/api/kanban";
import type { Lead } from "../types";

const POLL_VERSAO_MS = 3000;
const JANELA_IGNORAR_MUDANCA_LOCAL_MS = 8000;

type SyncResultado = {
  versao: string | null;
};

type UseKanbanRealtimeParams = {
  leadsRef: React.MutableRefObject<Lead[]>;
  onSync: (params: { silencioso?: boolean }) => Promise<void>;
  addToast?: (params: {
    type: "success" | "error" | "warning";
    title: string;
    description?: string;
  }) => void;
};

function contarMovimentacoesRemotas(anteriores: Lead[], atuais: Lead[]): number {
  const mapaAnterior = new Map(anteriores.map((lead) => [lead.id, lead]));
  let total = 0;

  for (const leadAtual of atuais) {
    const leadAnterior = mapaAnterior.get(leadAtual.id);
    if (!leadAnterior) continue;
    if (leadAnterior.id_estagio !== leadAtual.id_estagio) {
      total += 1;
    }
  }

  return total;
}

async function buscarVersao(): Promise<string | null> {
  try {
    const resposta = await fetch("/api/leads/sync", {
      credentials: "include",
    });
    if (!resposta.ok) return null;
    const json = await resposta.json() as SyncResultado;
    return json.versao;
  } catch {
    return null;
  }
}

export function useKanbanRealtime({ leadsRef, onSync, addToast }: UseKanbanRealtimeParams) {
  const versaoRef = useRef<string | null>(null);
  const movimentoLocalAteRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncEmAndamentoRef = useRef(false);
  const jaInicializouRef = useRef(false);

  const registrarMovimentoLocal = useCallback(() => {
    movimentoLocalAteRef.current = Date.now() + JANELA_IGNORAR_MUDANCA_LOCAL_MS;
  }, []);

  const verificarMudancas = useCallback(async () => {
    if (syncEmAndamentoRef.current) return;

    const novaVersao = await buscarVersao();
    if (!novaVersao) return;

    const versaoAnterior = versaoRef.current;

    // Primeira carga: define versão e carrega board
    if (versaoAnterior === null && !jaInicializouRef.current) {
      versaoRef.current = novaVersao;
      jaInicializouRef.current = true;
      await onSync({ silencioso: false });
      return;
    }

    // Versão mudou: verifica se é mudança local ou remota
    if (novaVersao !== versaoAnterior) {
      const ignorarToastRemoto = Date.now() < movimentoLocalAteRef.current;

      if (!ignorarToastRemoto) {
        // Buscar dados completos para contar movimentações e mostrar toast
        const resposta = await listarKanban();
        if (resposta.ok) {
          const totalMovimentacoes = contarMovimentacoesRemotas(leadsRef.current, resposta.dados.leads);

          if (totalMovimentacoes > 0) {
            addToast?.({
              type: "warning",
              title: `Outro usuario moveu ${totalMovimentacoes} ${totalMovimentacoes === 1 ? "lead" : "leads"}`,
              description: "O Kanban foi sincronizado automaticamente.",
            });
          }
        }
      }

      versaoRef.current = novaVersao;
      await onSync({ silencioso: true });
    }
  }, [onSync, addToast, leadsRef]);

  // Iniciar polling ao montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const agendarProximoPolling = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void verificarMudancas().finally(() => {
          agendarProximoPolling();
        });
      }, POLL_VERSAO_MS);
    };

    agendarProximoPolling();

    const aoMudarVisibilidade = () => {
      agendarProximoPolling();
    };

    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [verificarMudancas]);

  return {
    registrarMovimentoLocal,
  };
}
