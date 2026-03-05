"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { formataMoeda } from "@/lib/utils";
import type { Estagio, Lead, PendenciaLeadInfo, Funcionario } from "../types";
import { PendenciaBadge, getClasseBordaGravidade } from "./pendencia-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
};

type LeadVisualCue = {
  circle: string | null;
  border: string | null;
  emoji: string | null;
};

function getColumnTint(estagio: Estagio): string {
  if (estagio.tipo === "GANHO") {
    return "bg-gradient-to-b from-emerald-50/80 to-white";
  }
  if (estagio.tipo === "PERDIDO") {
    return "bg-gradient-to-b from-slate-100/80 to-white";
  }
  if (estagio.nome === "Pré Aprovação") {
    return "bg-gradient-to-b from-amber-50/70 to-white";
  }
  return "bg-white";
}

function getLeadVisualCue(lead: Lead, estagio: Estagio, pendencias?: PendenciaLeadInfo): LeadVisualCue {
  const hasPendenciaDocumento = pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") ?? false;
  const hasPendenciaAprovacao = pendencias?.tipos.includes("APROVACAO_GERENCIA_PENDENTE") ?? false;

  if (estagio.nome === "Pré Aprovação") {
    if (hasPendenciaDocumento || !lead.documento_aprovacao_url) {
      return {
        circle: "h-3 w-3 animate-pulse rounded-full bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.9)]",
        border: "border-rose-400 bg-rose-50/70",
        emoji: "",
      };
    }

    if (hasPendenciaAprovacao || !lead.aprovado_em) {
      return {
        circle: "h-3 w-3 animate-pulse rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.9)]",
        border: "border-amber-400 bg-amber-50/70",
        emoji: "",
      };
    }

    return {
      circle: "h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]",
      border: "border-emerald-300 bg-emerald-50/50",
      emoji: "✅",
    };
  }

  if (estagio.tipo === "GANHO") {
    return {
      circle: "h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]",
      border: "border-emerald-200",
      emoji: estagio.nome === "Fechado" ? "🎉" : "🤝",
    };
  }

  if (estagio.tipo === "PERDIDO") {
    return {
      circle: "h-2.5 w-2.5 rounded-full bg-slate-400",
      border: "border-slate-300 opacity-70 grayscale-[20%]",
      emoji: "",
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
}: KanbanBoardProps) {
  const usarFiltrados = leadsFiltradosPorEstagio && Object.values(leadsFiltradosPorEstagio).some(arr => arr.length > 0);
  const [agoraMs, setAgoraMs] = useState<number | null>(() => (typeof window === "undefined" ? null : Date.now()));

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgoraMs(Date.now()), 60000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {estagios.map((estagio) => {
          const leads = usarFiltrados ? leadsFiltradosPorEstagio[estagio.id] ?? [] : leadsPorEstagio[estagio.id] ?? [];
          
          return (
            <Droppable key={estagio.id} droppableId={estagio.id}>
              {(provided, snapshot) => (
                <div
                  className={cn(
                    "rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200",
                    getColumnTint(estagio),
                    snapshot.isDraggingOver && "border-blue-300 bg-blue-50/50"
                  )}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="mb-3 flex items-center gap-2">
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

                  <div className="space-y-2">
                    {leads.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        {modoFocoPendencias ? "Sem pendências nesta coluna" : "Nenhum lead"}
                      </div>
                    ) : (
                      leads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                          isDragDisabled={lead.id.startsWith("temp-")}
                        >
                          {(draggableProvided) => (
                            (() => {
                              const pendencias = pendenciasPorLead[lead.id];
                              const visualCue = getLeadVisualCue(lead, estagio, pendencias);
                              return (
                            <OptimisticSync active={lead.id.startsWith("temp-")} className="cursor-wait">
                              <Card
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={cn(
                                  lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-xl border border-slate-200/60 shadow-sm transition-all duration-200 hover:shadow-md",
                                  visualCue.border,
                                  getClasseBordaGravidade(pendenciasPorLead[lead.id]?.gravidadeMaxima)
                                )}
                                onClick={() => {
                                  if (lead.id.startsWith("temp-")) return;
                                  onLeadClick(lead);
                                }}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between">
                                    <Tooltip content={`${lead.nome}\n${lead.telefone}\nValor: ${formataMoeda(lead.valor_consorcio)}`} side="right">
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">{lead.nome}</p>
                                        <p className="text-xs text-slate-500">{lead.telefone}</p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                          {formataMoeda(lead.valor_consorcio)}
                                          {visualCue.emoji ? <span className="ml-1">{visualCue.emoji}</span> : null}
                                        </p>
                                         {estagio.nome === "Pré Aprovação" && pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") ? (
                                           <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                             🚨 Pendência de documento
                                           </span>
                                         ) : null}
                                         {estagio.nome === "Pré Aprovação" && !pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") && !lead.aprovado_em ? (
                                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                              ⏳ Pendência de análise
                                            </span>
                                         ) : null}
                                        {funcionarios.length > 0 && lead.id_funcionario && (
                                          <p className="mt-1 text-xs text-slate-400">
                                            {funcionarios.find(f => f.id === lead.id_funcionario)?.nome || "Responsável"}
                                          </p>
                                        )}
                                         <p className="text-xs text-slate-400">
                                          {agoraMs === null ? "" : formatarTempoRelativo(lead.atualizado_em, agoraMs)}
                                         </p>
                                      </div>
                                    </Tooltip>
                                    <div className="flex flex-col items-end gap-1.5">
                                      {visualCue.circle ? <span className={visualCue.circle} /> : null}
                                      {pendencias?.naoResolvidas ? (
                                        <PendenciaBadge
                                          resumo={{
                                            total: pendencias.naoResolvidas,
                                            totalLeads: 1,
                                            porTipo: pendencias.tipos.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {} as Record<string, number>),
                                            porGravidade: {
                                              [pendencias.gravidadeMaxima]: pendencias.naoResolvidas,
                                              critica: pendencias.gravidadeMaxima === "critica" ? pendencias.naoResolvidas : 0,
                                              alerta: pendencias.gravidadeMaxima === "alerta" ? pendencias.naoResolvidas : 0,
                                              info: pendencias.gravidadeMaxima === "info" ? pendencias.naoResolvidas : 0,
                                            },
                                          }}
                                        />
                                      ) : null}
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
