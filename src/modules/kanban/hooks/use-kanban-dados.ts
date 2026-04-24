import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcularPendenciasLead, type PendenciaCalculada } from "@/lib/calculo-pendencias";
import type { Estagio, Funcionario, Lead, Pdv } from "../types";
import { usePendenciasGlobais, type PendenciaInfo } from "./use-pendencias-globais";
import { useKanbanRealtime } from "./use-kanban-realtime";

type UseKanbanDadosParams = {
  addToast?: (params: {
    type: "success" | "error" | "warning";
    title: string;
    description?: string;
  }) => void;
};

export function useKanbanDados({ addToast }: UseKanbanDadosParams = {}) {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const leadsRef = useRef<Lead[]>([]);

  const {
    resumo: resumoPendencias,
    recarregar: recarregarPendencias,
    atualizarComDadosLocais,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  } = usePendenciasGlobais();

  const bootstrapRef = useRef<() => Promise<void> | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const { listarKanban } = await import("@/lib/api/kanban");
      const resposta = await listarKanban();
      if (!resposta.ok) return;

      setEstagios(resposta.dados.estagios);
      setLeads(resposta.dados.leads);
      setFuncionarios(resposta.dados.funcionarios);
      setPdvs(resposta.dados.pdvs);
    } finally {
      setCarregandoInicial(false);
    }
  }, []);

  useEffect(() => {
    bootstrapRef.current = bootstrap;
  }, [bootstrap]);

  const { registrarMovimentoLocal } = useKanbanRealtime({
    leadsRef,
    onSync: async ({ silencioso }) => {
      if (silencioso && bootstrapRef.current) {
        await bootstrapRef.current();
      }
    },
    addToast,
  });

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void bootstrap();
    }, 0);

    return () => clearTimeout(timer);
  }, [bootstrap]);

  const todasPendenciasLocais = useMemo<PendenciaCalculada[]>(() => {
    const pendencias: PendenciaCalculada[] = [];
    const mapaEstagios = Object.fromEntries(estagios.map((estagio) => [estagio.id, estagio]));

    for (const lead of leads) {
      const estagio = mapaEstagios[lead.id_estagio];
      if (!estagio) continue;
      pendencias.push(...calcularPendenciasLead(lead, estagio));
    }

    return pendencias;
  }, [leads, estagios]);

  const sincronizarPendencias = useCallback(() => {
    atualizarComDadosLocais(todasPendenciasLocais as PendenciaInfo[]);
  }, [atualizarComDadosLocais, todasPendenciasLocais]);

  useEffect(() => {
    if (leads.length > 0 || estagios.length > 0) {
      sincronizarPendencias();
    }
  }, [leads, estagios, sincronizarPendencias]);

  return {
    estagios,
    setEstagios,
    leads,
    setLeads,
    funcionarios,
    setFuncionarios,
    pdvs,
    setPdvs,
    carregandoInicial,
    bootstrap,
    registrarMovimentoLocal,
    resumoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
