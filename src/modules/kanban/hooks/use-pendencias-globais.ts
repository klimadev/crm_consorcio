"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TipoPendencia, LABELS_PENDENCIA } from "@/lib/validacoes";

export type PendenciaInfo = {
  id: string;
  id_lead: string;
  tipo: TipoPendencia;
  descricao: string;
  resolvida: boolean;
};

export type PendenciaGravidade = "critica" | "alerta" | "info";

export type ResumoPendencias = {
  total: number;
  totalLeads: number;
  porTipo: Record<TipoPendencia, number>;
  porGravidade: Record<PendenciaGravidade, number>;
};

export function getGravidadePendencia(tipo: TipoPendencia): PendenciaGravidade {
  switch (tipo) {
    case "DOCUMENTO_APROVACAO_PENDENTE":
      return "critica";
    case "ESTAGIO_PARADO":
      return "alerta";
    case "SEM_RESPOSTA":
    case "CARTA_CREDITO_PENDENTE":
    case "DOCUMENTOS_PENDENTES":
    case "QUEDA_RESERVA":
    case "ALTO_VALOR":
      return "info";
  }
}

function getNotificacoesAtivadas(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("notificacoes_pendencias_ativadas") === "true";
}

function setNotificacoesAtivadas(ativadas: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("notificacoes_pendencias_ativadas", String(ativadas));
}

function getNotificacaoPermissao(): NotificationPermission | "unknown" {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

async function requestNotificacaoPermissao(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function enviarNotificacao(titulo: string, corpo: string, icone?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  
  try {
    new Notification(titulo, {
      body: corpo,
      icon: icone ?? "/icon-notification.png",
      tag: "pendencias-crm",
      requireInteraction: false,
    });
  } catch (erro) {
    console.error("Erro ao enviar notificação:", erro);
  }
}

function detectarNovasPendencias(
  anteriores: PendenciaInfo[],
  atuais: PendenciaInfo[]
): PendenciaInfo[] {
  const idsAnteriores = new Set(anteriores.filter(p => !p.resolvida).map(p => p.id));
  return atuais.filter(p => !p.resolvida && !idsAnteriores.has(p.id));
}

export function usePendenciasGlobais() {
  const [pendencias, setPendencias] = useState<PendenciaInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [notificacoesAtivadas, setNotificacoesAtivadasState] = useState(getNotificacoesAtivadas);
  const pendenciasAnterioresRef = useRef<PendenciaInfo[]>([]);

  const buscarPendencias = useCallback(async () => {
    try {
      const res = await fetch("/api/pendencias");
      if (res.ok) {
        const json = await res.json();
        const novasPendencias: PendenciaInfo[] = json.pendencias ?? [];
        
        const novas = detectarNovasPendencias(pendenciasAnterioresRef.current, novasPendencias);
        
        if (novas.length > 0 && notificacoesAtivadas && getNotificacaoPermissao() === "granted") {
          const criticas = novas.filter(p => getGravidadePendencia(p.tipo) === "critica");
          const alertas = novas.filter(p => getGravidadePendencia(p.tipo) === "alerta");
          
          let titulo = "Nova pendência";
          let corpo = "";
          
          if (criticas.length > 0) {
            titulo = `${criticas.length} pendência${criticas.length > 1 ? "s" : ""} crítica${criticas.length > 1 ? "s" : ""}`;
            corpo = criticas.map(p => LABELS_PENDENCIA[p.tipo] || p.tipo).join(", ");
          } else if (alertas.length > 0) {
            titulo = `${alertas.length} pendência${alertas.length > 1 ? "s" : ""} pendente${alertas.length > 1 ? "s" : ""}`;
            corpo = alertas.map(p => p.descricao).slice(0, 2).join("; ");
          }
          
          if (corpo) {
            enviarNotificacao(titulo, corpo);
          }
        }
        
        pendenciasAnterioresRef.current = novasPendencias;
        setPendencias(novasPendencias);
      }
    } catch (erro) {
      console.error("Erro ao buscar pendências:", erro);
    } finally {
      setCarregando(false);
    }
  }, [notificacoesAtivadas]);

  const recarregar = useCallback(() => {
    setCarregando(true);
    buscarPendencias();
  }, [buscarPendencias]);

  const ativarNotificacoes = useCallback(async (): Promise<boolean> => {
    const permitido = await requestNotificacaoPermissao();
    if (permitido) {
      setNotificacoesAtivadas(true);
      setNotificacoesAtivadasState(true);
      return true;
    }
    return false;
  }, []);

  const desativarNotificacoes = useCallback(() => {
    setNotificacoesAtivadas(false);
    setNotificacoesAtivadasState(false);
  }, []);

  const alternarNotificacoes = useCallback(async (): Promise<boolean> => {
    if (notificacoesAtivadas) {
      desativarNotificacoes();
      return false;
    }
    return await ativarNotificacoes();
  }, [notificacoesAtivadas, ativarNotificacoes, desativarNotificacoes]);

  const permissaoNotificacao = useCallback((): NotificationPermission | "unknown" => {
    return getNotificacaoPermissao();
  }, []);

  useEffect(() => {
    buscarPendencias();
    const intervalo = setInterval(buscarPendencias, 60000);
    return () => clearInterval(intervalo);
  }, [buscarPendencias]);

  const resumo = useMemo<ResumoPendencias>(() => {
    const leadsSet = new Set<string>();
    const porTipo: Record<TipoPendencia, number> = {
      SEM_RESPOSTA: 0,
      CARTA_CREDITO_PENDENTE: 0,
      DOCUMENTOS_PENDENTES: 0,
      QUEDA_RESERVA: 0,
      ALTO_VALOR: 0,
      DOCUMENTO_APROVACAO_PENDENTE: 0,
      ESTAGIO_PARADO: 0,
    };
    const porGravidade: Record<PendenciaGravidade, number> = {
      critica: 0,
      alerta: 0,
      info: 0,
    };

    for (const p of pendencias) {
      if (!p.resolvida) {
        leadsSet.add(p.id_lead);
        porTipo[p.tipo]++;
        porGravidade[getGravidadePendencia(p.tipo)]++;
      }
    }

    return {
      total: pendencias.filter((p) => !p.resolvida).length,
      totalLeads: leadsSet.size,
      porTipo,
      porGravidade,
    };
  }, [pendencias]);

  const pendenciasPorLead = useMemo(() => {
    const mapa: Record<string, { total: number; naoResolvidas: number; tipos: TipoPendencia[]; gravidadeMaxima: PendenciaGravidade }> = {};

    for (const p of pendencias) {
      if (p.resolvida) continue;
      if (!mapa[p.id_lead]) {
        mapa[p.id_lead] = { total: 0, naoResolvidas: 0, tipos: [], gravidadeMaxima: "info" };
      }
      mapa[p.id_lead].total++;
      mapa[p.id_lead].naoResolvidas++;
      mapa[p.id_lead].tipos.push(p.tipo);
      const gravidade = getGravidadePendencia(p.tipo);
      const ordem = { info: 0, alerta: 1, critica: 2 };
      if (ordem[gravidade] > ordem[mapa[p.id_lead].gravidadeMaxima]) {
        mapa[p.id_lead].gravidadeMaxima = gravidade;
      }
    }

    return mapa;
  }, [pendencias]);

  return {
    pendencias,
    pendenciasPorLead,
    resumo,
    carregando,
    recarregar,
    notificacoesAtivadas,
    ativarNotificacoes,
    desativarNotificacoes,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
