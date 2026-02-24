"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

const STORAGE_KEYS = {
  NOTIFICACOES_ATIVADAS: "notificacoes_pendencias_ativadas",
  PENDENCIAS_ANTERIORES: "pendencias_anteriores",
  JA_NOTIFICADAS: "pendencias_ja_notificadas",
  PRIMEIRA_CARGA: "pendencias_primeira_carga",
};

function getNotificacoesAtivadas(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.NOTIFICACOES_ATIVADAS) === "true";
}

function setNotificacoesAtivadas(ativadas: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.NOTIFICACOES_ATIVADAS, String(ativadas));
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

function getPendenciasAnteriores(): PendenciaInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDENCIAS_ANTERIORES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setPendenciasAnteriores(pendencias: PendenciaInfo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PENDENCIAS_ANTERIORES, JSON.stringify(pendencias));
  } catch (e) {
    console.error("Erro ao salvar pendências anteriores:", e);
  }
}

function getJaNotificadas(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.JA_NOTIFICADAS);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function setJaNotificadas(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.JA_NOTIFICADAS, JSON.stringify([...ids]));
  } catch (e) {
    console.error("Erro ao salvar pendências notificadas:", e);
  }
}

function isPrimeiraCarga(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEYS.PRIMEIRA_CARGA) !== "false";
}

function setPrimeiraCarga(valor: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.PRIMEIRA_CARGA, String(valor));
}

function detectarNovasPendenciasNaoNotificadas(
  anteriores: PendenciaInfo[],
  atuais: PendenciaInfo[],
  jaNotificadas: Set<string>
): PendenciaInfo[] {
  const idsAnteriores = new Set(anteriores.filter(p => !p.resolvida).map(p => p.id));
  return atuais.filter(
    p => !p.resolvida && !idsAnteriores.has(p.id) && !jaNotificadas.has(p.id)
  );
}

type PendenciasContextValue = {
  pendencias: PendenciaInfo[];
  pendenciasPorLead: Record<string, { total: number; naoResolvidas: number; tipos: TipoPendencia[]; gravidadeMaxima: PendenciaGravidade }>;
  resumo: ResumoPendencias;
  carregando: boolean;
  recarregar: () => void;
  forcarAtualizacao: () => void;
  atualizarComDadosLocais: (pendencias: PendenciaInfo[]) => void;
  notificacoesAtivadas: boolean;
  ativarNotificacoes: () => Promise<boolean>;
  desativarNotificacoes: () => void;
  alternarNotificacoes: () => Promise<boolean>;
  permissaoNotificacao: () => NotificationPermission | "unknown";
  marcarPendenciasAtuaisComoNotificadas: () => void;
};

const PendenciasContext = createContext<PendenciasContextValue | null>(null);

export function usePendenciasProvider() {
  const [pendencias, setPendencias] = useState<PendenciaInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [notificacoesAtivadas, setNotificacoesAtivadasState] = useState(getNotificacoesAtivadas);
  const jaNotificadasRef = useRef<Set<string>>(getJaNotificadas());
  const pendenciasAnterioresRef = useRef<PendenciaInfo[]>(getPendenciasAnteriores());

  const buscarPendencias = useCallback(async () => {
    try {
      const res = await fetch("/api/pendencias");
      if (res.ok) {
        const json = await res.json();
        const novasPendencias: PendenciaInfo[] = json.pendencias ?? [];
        
        const ehPrimeiraCarga = isPrimeiraCarga();
        const jaNotificadas = jaNotificadasRef.current;
        const anteriores = pendenciasAnterioresRef.current;
        
        if (ehPrimeiraCarga && anteriores.length > 0) {
          setPrimeiraCarga(false);
        }
        
        if (!ehPrimeiraCarga || anteriores.length === 0) {
          pendenciasAnterioresRef.current = novasPendencias;
          setPendenciasAnteriores(novasPendencias);
          setPendencias(novasPendencias);
          setCarregando(false);
          return;
        }
        
        const novas = detectarNovasPendenciasNaoNotificadas(anteriores, novasPendencias, jaNotificadas);
        
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
            for (const p of novas) {
              jaNotificadasRef.current.add(p.id);
            }
            setJaNotificadas(jaNotificadasRef.current);
          }
        }
        
        pendenciasAnterioresRef.current = novasPendencias;
        setPendenciasAnteriores(novasPendencias);
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
      setPendenciasAnteriores(pendencias);
      setPrimeiraCarga(false);
      return true;
    }
    return false;
  }, [pendencias]);

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

  const forcarAtualizacao = useCallback(() => {
    buscarPendencias();
  }, [buscarPendencias]);

  const atualizarComDadosLocais = useCallback((novasPendencias: PendenciaInfo[]) => {
    pendenciasAnterioresRef.current = novasPendencias;
    setPendenciasAnteriores(novasPendencias);
    setPendencias(novasPendencias);
    setCarregando(false);
  }, []);

  const marcarPendenciasAtuaisComoNotificadas = useCallback(() => {
    const ids = new Set<string>();
    for (const p of pendencias) {
      if (!p.resolvida) {
        ids.add(p.id);
      }
    }
    setJaNotificadas(ids);
    jaNotificadasRef.current = ids;
    setPendenciasAnteriores(pendencias);
    pendenciasAnterioresRef.current = pendencias;
  }, [pendencias]);

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
    forcarAtualizacao,
    atualizarComDadosLocais,
    notificacoesAtivadas,
    ativarNotificacoes,
    desativarNotificacoes,
    alternarNotificacoes,
    permissaoNotificacao,
    marcarPendenciasAtuaisComoNotificadas,
  };
}

const defaultValue = {
  pendencias: [],
  pendenciasPorLead: {} as Record<string, { total: number; naoResolvidas: number; tipos: TipoPendencia[]; gravidadeMaxima: PendenciaGravidade }>,
  resumo: { total: 0, totalLeads: 0, porTipo: {} as Record<TipoPendencia, number>, porGravidade: { critica: 0, alerta: 0, info: 0 } },
  carregando: true,
  recarregar: () => {},
  forcarAtualizacao: () => {},
  atualizarComDadosLocais: () => {},
  notificacoesAtivadas: false,
  ativarNotificacoes: async () => false,
  desativarNotificacoes: () => {},
  alternarNotificacoes: async () => false,
  permissaoNotificacao: () => "denied" as NotificationPermission | "unknown",
  marcarPendenciasAtuaisComoNotificadas: () => {},
};

export function usePendenciasGlobais() {
  const context = useContext(PendenciasContext);
  return context ?? defaultValue;
}

export function PendenciasProvider({ children }: { children: ReactNode }) {
  const value = usePendenciasProvider();
  return (
    <PendenciasContext.Provider value={value}>
      {children}
    </PendenciasContext.Provider>
  );
}
