import { useCallback, useEffect, useMemo, useState } from "react";
import { calcularPendenciasLead, type PendenciaCalculada } from "@/lib/calculo-pendencias";
import type { Estagio, Funcionario, Lead } from "../types";
import { usePendenciasGlobais, type PendenciaInfo } from "./use-pendencias-globais";
import { listarKanban } from "@/lib/api/kanban";

export function useKanbanDados() {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  const {
    resumo: resumoPendencias,
    recarregar: recarregarPendencias,
    atualizarComDadosLocais,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  } = usePendenciasGlobais();

  const bootstrap = useCallback(async () => {
    const resposta = await listarKanban();
    if (!resposta.ok) return;

    setEstagios(resposta.dados.estagios);
    setLeads(resposta.dados.leads);
    setFuncionarios(resposta.dados.funcionarios);
  }, []);

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
    bootstrap,
    resumoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
