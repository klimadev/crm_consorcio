"use client";

import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { formataMoeda } from "@/lib/utils";
import type { Estagio, Lead } from "../types";

type KanbanBoardProps = {
  estagios: Estagio[];
  leadsPorEstagio: Record<string, Lead[]>;
  pendenciasPorLead: Record<string, { total: number; naoResolvidas: number }>;
  todasPendencias: { id_lead: string }[];
  onDragEnd: (resultado: DropResult) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
};

export function KanbanBoard({
  estagios,
  leadsPorEstagio,
  pendenciasPorLead,
  onDragEnd,
  onLeadClick,
}: KanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {estagios.map((estagio) => (
          <Droppable key={estagio.id} droppableId={estagio.id}>
            {(provided) => (
              <div
                className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {estagio.nome} <span className="font-normal text-slate-400">({leadsPorEstagio[estagio.id]?.length ?? 0})</span>
                  </p>
                </div>

                <div className="space-y-2">
                  {(leadsPorEstagio[estagio.id] ?? []).map((lead, index) => (
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
                            className={lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-xl border border-slate-200/60 shadow-sm transition-all duration-200 hover:shadow-md"}
                            onClick={() => {
                              if (lead.id.startsWith("temp-")) return;
                              onLeadClick(lead);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{lead.nome}</p>
                                  <p className="text-xs text-slate-500">{lead.telefone}</p>
                                  <p className="mt-1 text-sm font-medium text-slate-700">{formataMoeda(lead.valor_consorcio)}</p>
                                </div>
                                {(() => {
                                  const pendencias = pendenciasPorLead[lead.id];
                                  if (!pendencias) return null;
                                  return pendencias.naoResolvidas ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                      {pendencias.naoResolvidas}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </OptimisticSync>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
