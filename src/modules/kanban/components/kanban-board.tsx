"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { formataMoeda } from "@/lib/utils";
import type { Estagio, Lead, PendenciaLeadInfo, Funcionario } from "../types";
import { getClasseBordaGravidade } from "./pendencia-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Trash2, Loader2, FileWarning, Clock, CheckCircle, AlertTriangle, Users, GripVertical, Megaphone, MessageCircle, PenLine } from "lucide-react";
import { EmptyState } from "./empty-state";

type KanbanBoardProps = {
  estagios: Estagio[];
  leadsPorEstagio: Record<string, Lead[]>;
  leadsFiltradosPorEstagio: Record<string, Lead[]>;
  pendenciasPorLead: Record<string, PendenciaLeadInfo>;
  todasPendencias: { id_lead: string }[];
  onDragEnd: (resultado: DropResult) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  modoFocoPendencias?: boolean;
  funcionarios?: Funcionario[];
  excluirTodosIndefinidos?: () => Promise<void>;
  temFiltrosAtivos?: boolean;
};

type LeadVisualCue = {
  circle: string | null;
  border: string | null;
  emoji: string | null;
};

function getColumnTint(estagio: Estagio): string {
  if (estagio.tipo === "GANHO") {
    return "bg-gradient-to-b from-emerald-50/90 to-white/80";
  }
  if (estagio.tipo === "PERDIDO") {
    return "bg-gradient-to-b from-slate-100/90 to-white/80";
  }
  if (estagio.nome === "Pré Aprovação") {
    return "bg-gradient-to-b from-amber-50/90 to-white/80";
  }
  return "bg-gradient-to-b from-slate-50/50 to-white/90";
}

function getLeadVisualCue(lead: Lead, estagio: Estagio, pendencias?: PendenciaLeadInfo): LeadVisualCue {
  const hasPendenciaDocumento = pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") ?? false;
  const hasPendenciaAprovacao = pendencias?.tipos.includes("APROVACAO_GERENCIA_PENDENTE") ?? false;

  if (estagio.nome === "Pré Aprovação") {
    if (hasPendenciaDocumento || !lead.documento_aprovacao_url) {
      return {
        circle: "h-2.5 w-2.5 rounded-full bg-rose-500",
        border: "border-rose-300 bg-rose-50/80",
        emoji: null,
      };
    }

    if (hasPendenciaAprovacao || !lead.aprovado_em) {
      return {
        circle: "h-2.5 w-2.5 rounded-full bg-amber-500",
        border: "border-amber-300 bg-amber-50/80",
        emoji: null,
      };
    }

    return {
      circle: "h-2.5 w-2.5 rounded-full bg-emerald-500",
      border: "border-emerald-300 bg-emerald-50/80",
      emoji: null,
    };
  }

  if (estagio.tipo === "GANHO") {
    return {
      circle: "h-2.5 w-2.5 rounded-full bg-emerald-500",
      border: "border-emerald-200 bg-emerald-50/50",
      emoji: null,
    };
  }

  if (estagio.tipo === "PERDIDO") {
    return {
      circle: "h-2 w-2 rounded-full bg-slate-400",
      border: "border-slate-200 bg-slate-100/50",
      emoji: null,
    };
  }

  return {
    circle: null,
    border: null,
    emoji: null,
  };
}

function formatarTempoRelativo(atualizadoEm: string, agoraMs: number): string {
  const atualizadoMs = new Date(atualizadoEm).getTime();
  if (Number.isNaN(atualizadoMs)) return "";

  const diff = agoraMs - atualizadoMs;
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 7) return `${dias}d atras`;
  if (dias < 30) return `${Math.floor(dias / 7)} sem atras`;
  return `${Math.floor(dias / 30)}m atras`;
}

export function KanbanBoard({
  estagios,
  leadsPorEstagio,
  leadsFiltradosPorEstagio,
  pendenciasPorLead,
  onDragEnd,
  onLeadClick,
  modoFocoPendencias = false,
  funcionarios = [],
  excluirTodosIndefinidos,
  temFiltrosAtivos = false,
}: KanbanBoardProps) {
  // Sempre usa leadsFiltradosPorEstagio - que já inclui ordenação e é idêntico a leadsPorEstagio quando não há filtros
  const [agoraMs, setAgoraMs] = useState<number | null>(() => typeof window === "undefined" ? null : Date.now());
  const [excluindoIndefinidos, setExcluindoIndefinidos] = useState(false);

  const handleExcluirIndefinidos = async () => {
    setExcluindoIndefinidos(true);
    try {
      await excluirTodosIndefinidos?.();
    } finally {
      setExcluindoIndefinidos(false);
    }
  };

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgoraMs(Date.now()), 60000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {estagios.map((estagio) => {
          const leads = leadsFiltradosPorEstagio[estagio.id] ?? [];
          
          return (
            <Droppable key={estagio.id} droppableId={estagio.id}>
              {(provided, snapshot) => (
                <div
                  className={cn(
                    "rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300",
                    getColumnTint(estagio),
                    snapshot.isDraggingOver 
                      ? "border-blue-300 bg-blue-50/50 shadow-lg shadow-blue-100/50" 
                      : "hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200/50"
                  )}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          estagio.tipo === "GANHO" && "bg-emerald-500",
                          estagio.tipo === "PERDIDO" && "bg-slate-500",
                          estagio.tipo === "ABERTO" && estagio.nome === "Pré Aprovação" && "bg-amber-400",
                          estagio.tipo === "ABERTO" && estagio.nome !== "Pré Aprovação" && "bg-blue-400",
                        )}
                      />
                      <p className="text-sm font-semibold text-slate-700">
                        {estagio.nome} <span className="font-normal text-slate-400">({leads.length})</span>
                      </p>
                    </div>
                    {estagio.nome === "Indefinido" && leads.length > 0 && excluirTodosIndefinidos && (
                      <Tooltip content={excluindoIndefinidos ? "Removendo..." : `Apagar ${leads.length} lead(s) indefinido(s)`}>
                        <button
                          onClick={handleExcluirIndefinidos}
                          disabled={excluindoIndefinidos}
                          className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                        >
                          {excluindoIndefinidos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </Tooltip>
                    )}
                  </div>

                  <div className="space-y-2">
                    {leads.length === 0 ? (
                      <EmptyState 
                        titulo={modoFocoPendencias ? "Sem pendências" : "Nenhum lead"}
                        descricao={modoFocoPendencias ? "Esta coluna não tem pendências" : "Arraste leads para cá ou adicione novos"}
                        variant="leads"
                        className="py-8"
                      />
                    ) : (
                      leads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                          isDragDisabled={lead.id.startsWith("temp-")}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            (() => {
                              const pendencias = pendenciasPorLead[lead.id];
                              const visualCue = getLeadVisualCue(lead, estagio, pendencias);
                              const diasParados = agoraMs 
                                ? Math.floor((agoraMs - new Date(lead.atualizado_em).getTime()) / (1000 * 60 * 60 * 24))
                                : 0;
                              
                              return (
                            <OptimisticSync active={lead.id.startsWith("temp-")} className="cursor-wait">
                              <Card
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={cn(
                                  lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-2xl border border-slate-200/60 shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1",
                                  visualCue.border,
                                  getClasseBordaGravidade(pendenciasPorLead[lead.id]?.gravidadeMaxima),
                                  draggableSnapshot.isDragging && "shadow-2xl scale-[1.02] rotate-1 opacity-90"
                                )}
                                onClick={() => {
                                  if (lead.id.startsWith("temp-")) return;
                                  onLeadClick(lead);
                                }}
                              >
                                <CardContent className="p-4">
                                  {/* Nome em destaque */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h3 className="text-base font-bold text-slate-800 truncate flex items-center gap-1.5">
                                        {!lead.id.startsWith("temp-") && draggableProvided.dragHandleProps && (
                                          <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                                        )}
                                        {lead.nome}
                                      </h3>
                                      
                                      {/* Telefone */}
                                      <p className="text-xs text-slate-500 mt-0.5">{lead.telefone}</p>
                                      
                                      {/* Badge de Origem */}
                                      {lead.origem === "ANUNCIO_CTWA" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200 mt-1">
                                          <Megaphone className="w-3 h-3" /> Anúncio
                                        </span>
                                      )}
                                      {lead.origem === "SINCRONIZACAO_WHATSAPP" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200 mt-1">
                                          <MessageCircle className="w-3 h-3" /> WhatsApp
                                        </span>
                                      )}
                                      {lead.origem === "MANUAL" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 mt-1">
                                          <PenLine className="w-3 h-3" /> Manual
                                        </span>
                                      )}
                                      
                                      {/* Valor em destaque */}
                                      <p className="text-lg font-bold text-emerald-600 mt-2">
                                        {formataMoeda(lead.valor_consorcio)}
                                      </p>
                                      
                                      {/* Badges de indicadores */}
                                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                                        {estagio.nome === "Pré Aprovação" && (pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") || !lead.documento_aprovacao_url) ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200">
                                            <FileWarning className="w-3 h-3" /> Documento
                                          </span>
                                        ) : null}
                                        {estagio.nome === "Pré Aprovação" && !pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") && !lead.aprovado_em ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                                            <Clock className="w-3 h-3" /> Análise
                                          </span>
                                        ) : null}
                                        {estagio.nome === "Pré Aprovação" && lead.aprovado_em ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
                                            <CheckCircle className="w-3 h-3" /> Aprovado
                                          </span>
                                        ) : null}
                                        {diasParados > 3 && estagio.tipo !== "GANHO" && estagio.tipo !== "PERDIDO" ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                                            <Clock className="w-3 h-3" /> {diasParados}d parado
                                          </span>
                                        ) : null}
                                        {pendencias?.naoResolvidas && pendencias.naoResolvidas > 0 && !estagio.nome.includes("Pré Aprovação") ? (
                                          <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                            pendencias.gravidadeMaxima === "critica" && "bg-rose-100 text-rose-700 border-rose-200",
                                            pendencias.gravidadeMaxima === "alerta" && "bg-amber-100 text-amber-700 border-amber-200",
                                            pendencias.gravidadeMaxima === "info" && "bg-blue-100 text-blue-700 border-blue-200"
                                          )}>
                                            <AlertTriangle className="w-3 h-3" /> {pendencias.naoResolvidas} pendência{pendencias.naoResolvidas > 1 ? 's' : ''}
                                          </span>
                                        ) : null}
                                      </div>
                                      
                                      {/* Responsável e tempo */}
                                      <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
                                        {funcionarios.length > 0 && lead.id_funcionario ? (
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {funcionarios.find(f => f.id === lead.id_funcionario)?.nome || "Responsável"}
                                          </span>
                                        ) : null}
                                        {agoraMs !== null && (
                                          <span className="flex items-center gap-1">
                                            {agoraMs === null ? "" : formatarTempoRelativo(lead.atualizado_em, agoraMs)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Indicador visual lateral */}
                                    <div className="flex flex-col items-end gap-1.5">
                                      {visualCue.circle ? <span className={visualCue.circle} /> : null}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </OptimisticSync>
                              );
                            })()
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
