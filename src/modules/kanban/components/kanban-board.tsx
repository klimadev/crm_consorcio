"use client";

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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {estagios.map((estagio) => {
          const leads = usarFiltrados ? leadsFiltradosPorEstagio[estagio.id] ?? [] : leadsPorEstagio[estagio.id] ?? [];
          
          return (
            <Droppable key={estagio.id} droppableId={estagio.id}>
              {(provided, snapshot) => (
                <div
                  className={cn(
                    "rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200",
                    snapshot.isDraggingOver && "border-blue-300 bg-blue-50/50"
                  )}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="mb-3">
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
                            <OptimisticSync active={lead.id.startsWith("temp-")} className="cursor-wait">
                              <Card
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={cn(
                                  lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-xl border border-slate-200/60 shadow-sm transition-all duration-200 hover:shadow-md",
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
                                        <p className="mt-1 text-sm font-medium text-slate-700">{formataMoeda(lead.valor_consorcio)}</p>
                                        {funcionarios.length > 0 && lead.id_funcionario && (
                                          <p className="mt-1 text-xs text-slate-400">
                                            {funcionarios.find(f => f.id === lead.id_funcionario)?.nome || "Responsável"}
                                          </p>
                                        )}
                                        <p className="text-xs text-slate-400">
                                          {(() => {
                                            const diff = Date.now() - new Date(lead.atualizado_em).getTime();
                                            const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
                                            if (dias === 0) return "Hoje";
                                            if (dias === 1) return "Ontem";
                                            if (dias < 7) return `${dias}d atrás`;
                                            if (dias < 30) return `${Math.floor(dias / 7)} sem atrás`;
                                            return `${Math.floor(dias / 30)}m atrás`;
                                          })()}
                                        </p>
                                      </div>
                                    </Tooltip>
                                    {(() => {
                                      const pendencias = pendenciasPorLead[lead.id];
                                      if (!pendencias) return null;
                                      return pendencias.naoResolvidas ? (
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
                                      ) : null;
                                    })()}
                                  </div>
                                </CardContent>
                              </Card>
                            </OptimisticSync>
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
