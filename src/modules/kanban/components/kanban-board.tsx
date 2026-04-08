"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { formataMoeda } from "@/lib/utils";
import type { Estagio, Lead, PendenciaLeadInfo, Funcionario, ResumoEstagioKanban } from "../types";
import { getClasseBordaGravidade } from "./pendencia-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Trash2, Loader2, FileWarning, Clock, CheckCircle, AlertTriangle, Users, GripVertical, Megaphone, MessageCircle, PenLine, TrendingUp } from "lucide-react";
import { EmptyState } from "./empty-state";

type KanbanBoardProps = {
  estagios: Estagio[];
  leadsFiltradosPorEstagio: Record<string, Lead[]>;
  pendenciasPorLead: Record<string, PendenciaLeadInfo>;
  todasPendencias: { id_lead: string }[];
  onDragEnd: (resultado: DropResult) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  modoFocoPendencias?: boolean;
  funcionarios?: Funcionario[];
  resumoPorEstagio: Record<string, ResumoEstagioKanban>;
  excluirTodosIndefinidos?: () => Promise<void>;
};

type LeadVisualCue = {
  circle: string | null;
  border: string | null;
  emoji: string | null;
};

function getColumnTint(estagio: Estagio): string {
  if (estagio.tipo === "GANHO") {
    return "bg-gradient-to-b from-success/10 to-background-surface";
  }
  if (estagio.tipo === "PERDIDO") {
    return "bg-gradient-to-b from-muted to-background-surface";
  }
  if (estagio.nome === "Pré Aprovação") {
    return "bg-gradient-to-b from-warning/10 to-background-surface";
  }
  return "bg-gradient-to-b from-background-surface to-background";
}

function getClassePontoEstagio(estagio: Estagio): string {
  if (estagio.tipo === "GANHO") return "bg-success";
  if (estagio.tipo === "PERDIDO") return "bg-foreground-disabled";
  if (estagio.nome === "Pré Aprovação") return "bg-warning";
  return "bg-info";
}

function getClasseBadgeOrigem(origem?: Lead["origem"]): string {
  if (origem === "ANUNCIO_CTWA") {
    return "border-info/25 bg-info/10 text-foreground";
  }

  if (origem === "SINCRONIZACAO_WHATSAPP") {
    return "border-success/25 bg-success/10 text-foreground";
  }

  return "border-border/70 bg-muted/70 text-foreground-muted";
}

function getClasseBadgePendencia(gravidade?: PendenciaLeadInfo["gravidadeMaxima"]): string {
  if (gravidade === "critica") {
    return "border-destructive/25 bg-destructive/10 text-foreground";
  }

  if (gravidade === "alerta") {
    return "border-warning/25 bg-warning/10 text-foreground";
  }

  return "border-info/25 bg-info/10 text-foreground";
}

function getLeadVisualCue(lead: Lead, estagio: Estagio, pendencias?: PendenciaLeadInfo): LeadVisualCue {
  const hasPendenciaDocumento = pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") ?? false;
  const hasPendenciaAprovacao = pendencias?.tipos.includes("APROVACAO_GERENCIA_PENDENTE") ?? false;

  if (estagio.nome === "Pré Aprovação") {
    if (hasPendenciaDocumento || !lead.documento_aprovacao_url) {
      return {
        circle: "h-2.5 w-2.5 rounded-full bg-destructive",
        border: "border-destructive/30 ring-1 ring-destructive/15",
        emoji: null,
      };
    }

    if (hasPendenciaAprovacao || !lead.aprovado_em) {
      return {
        circle: "h-2.5 w-2.5 rounded-full bg-warning",
        border: "border-warning/30 ring-1 ring-warning/15",
        emoji: null,
      };
    }

    return {
      circle: "h-2.5 w-2.5 rounded-full bg-success",
      border: "border-success/30 ring-1 ring-success/15",
      emoji: null,
    };
  }

  if (estagio.tipo === "GANHO") {
    return {
      circle: "h-2.5 w-2.5 rounded-full bg-success",
      border: "border-success/30 ring-1 ring-success/15",
      emoji: null,
    };
  }

  if (estagio.tipo === "PERDIDO") {
    return {
      circle: "h-2 w-2 rounded-full bg-foreground-disabled",
      border: "border-border/80 bg-muted/80",
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

function formatarMoedaCompacta(valor: number): string {
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1).replace(".0", "")} mi`;
  }

  if (valor >= 1000) {
    return `R$ ${Math.round(valor / 1000)} mil`;
  }

  return formataMoeda(valor);
}

function getResumoProximoPasso(
  lead: Lead,
  estagio: Estagio,
  pendencias?: PendenciaLeadInfo,
  diasParados = 0,
): string {
  if (estagio.nome === "Pré Aprovação") {
    if (pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") || !lead.documento_aprovacao_url) {
      return "Enviar documento";
    }

    if (pendencias?.tipos.includes("APROVACAO_GERENCIA_PENDENTE") || !lead.aprovado_em) {
      return "Aguardar aprovação";
    }

    return "Mover para fechado";
  }

  if (pendencias?.naoResolvidas) {
    return `${pendencias.naoResolvidas} pendência${pendencias.naoResolvidas > 1 ? "s" : ""}`;
  }

  if (diasParados > 3) {
    return `${diasParados}d sem avanço`;
  }

  if (estagio.tipo === "GANHO") {
    return "Lead convertido";
  }

  if (estagio.tipo === "PERDIDO") {
    return "Lead encerrado";
  }

  return "Seguir contato";
}

export function KanbanBoard({
  estagios,
  leadsFiltradosPorEstagio,
  pendenciasPorLead,
  onDragEnd,
  onLeadClick,
  modoFocoPendencias = false,
  funcionarios = [],
  resumoPorEstagio,
  excluirTodosIndefinidos,
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
       <div className="flex gap-4 overflow-x-auto pb-6">
          {estagios.map((estagio) => {
            const leads = leadsFiltradosPorEstagio[estagio.id] ?? [];
            const resumoEstagio = resumoPorEstagio[estagio.id];
            
            return (
             <Droppable key={estagio.id} droppableId={estagio.id}>
               {(provided, snapshot) => (
                     <div
                       className={cn(
                         "w-[292px] shrink-0 rounded-2xl border border-border/70 bg-background-surface p-3 shadow-md shadow-black/25 transition-all duration-300 lg:w-[320px]",
                         getColumnTint(estagio),
                        snapshot.isDraggingOver 
                          ? "border-info/35 shadow-lg shadow-black/35" 
                          : "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/30",
                        "min-h-0 max-h-[calc(100vh-200px)] overflow-y-auto"
                      )}
                     ref={provided.innerRef}
                     {...provided.droppableProps}
                   >
                    <div className="mb-3 rounded-2xl border border-border/70 bg-background/80 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                         <span
                           className={cn(
                             "h-2.5 w-2.5 rounded-full",
                            getClassePontoEstagio(estagio),
                          )}
                        />
                          <div className="flex flex-col">
                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                             {estagio.nome}
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {resumoEstagio?.quantidade ?? leads.length} lead{(resumoEstagio?.quantidade ?? leads.length) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        {estagio.nome === "Indefinido" && leads.length > 0 && excluirTodosIndefinidos && (
                          <Tooltip content={excluindoIndefinidos ? "Removendo..." : `Apagar ${leads.length} lead(s) indefinido(s)`}>
                            <button
                              onClick={handleExcluirIndefinidos}
                              disabled={excluindoIndefinidos}
                              className="rounded p-1 text-foreground-disabled hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            >
                              {excluindoIndefinidos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </Tooltip>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-muted/70 px-3 py-2">
                          <p className="text-foreground-disabled">Valor</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatarMoedaCompacta(resumoEstagio?.valorTotal ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/70 px-3 py-2">
                          <p className="text-foreground-disabled">Em atenção</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {(resumoEstagio?.pendencias ?? 0) > 0
                              ? `${resumoEstagio?.pendencias ?? 0} com pendência`
                              : "Sem alerta"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-foreground-muted">
                        {(resumoEstagio?.parados ?? 0) > 0
                          ? `${resumoEstagio?.parados ?? 0} parados há mais de 3 dias`
                          : "Fluxo sem leads parados há mais de 3 dias"}
                      </p>
                    </div>

                   <div className="space-y-2.5">
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
                                     lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-2xl border border-border/70 bg-background-elevated shadow-md shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/30",
                                     visualCue.border,
                                     getClasseBordaGravidade(pendenciasPorLead[lead.id]?.gravidadeMaxima),
                                     draggableSnapshot.isDragging && "border-info/40 shadow-xl shadow-black/40 scale-[1.02] opacity-95"
                                  )}
                                 onClick={() => {
                                   if (lead.id.startsWith("temp-")) return;
                                   onLeadClick(lead);
                                 }}
                                >
                                 <CardContent className="p-3.5">
                                     <div className="flex items-start justify-between gap-3">
                                       <div className="min-w-0 flex-1">
                                         <div className="flex items-start justify-between gap-2">
                                           <h3 className="flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold text-foreground">
                                           {!lead.id.startsWith("temp-") && draggableProvided.dragHandleProps && (
                                             <GripVertical className="h-4 w-4 flex-shrink-0 text-foreground-disabled" />
                                           )}
                                             <span className="truncate">{lead.nome}</span>
                                           </h3>
                                           <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
                                             {agoraMs === null ? "" : formatarTempoRelativo(lead.atualizado_em, agoraMs)}
                                           </span>
                                         </div>

                                         <p className="mt-1 text-sm text-foreground-muted">{lead.telefone}</p>

                                         <p className="mt-3 text-xl font-bold text-success">
                                           {formataMoeda(lead.valor_consorcio)}
                                         </p>

                                         <div className="mt-3 rounded-xl border border-border/70 bg-background px-3 py-2">
                                           <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-disabled">
                                             Próximo passo
                                           </p>
                                           <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                                             {estagio.nome === "Pré Aprovação" && (pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") || !lead.documento_aprovacao_url) ? <FileWarning className="h-4 w-4 text-destructive" /> : null}
                                             {estagio.nome === "Pré Aprovação" && !pendencias?.tipos.includes("DOCUMENTO_APROVACAO_PENDENTE") && !lead.aprovado_em ? <Clock className="h-4 w-4 text-warning" /> : null}
                                             {estagio.nome === "Pré Aprovação" && lead.aprovado_em ? <CheckCircle className="h-4 w-4 text-success" /> : null}
                                             {!estagio.nome.includes("Pré Aprovação") && pendencias?.naoResolvidas ? <AlertTriangle className="h-4 w-4 text-warning" /> : null}
                                             {!pendencias?.naoResolvidas && diasParados <= 3 && estagio.tipo !== "GANHO" && estagio.tipo !== "PERDIDO" ? <TrendingUp className="h-4 w-4 text-info" /> : null}
                                             <span>{getResumoProximoPasso(lead, estagio, pendencias, diasParados)}</span>
                                           </div>
                                         </div>

                                         <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                           <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium", getClasseBadgeOrigem(lead.origem))}>
                                             {lead.origem === "ANUNCIO_CTWA" ? <Megaphone className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "SINCRONIZACAO_WHATSAPP" ? <MessageCircle className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "MANUAL" || !lead.origem ? <PenLine className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "ANUNCIO_CTWA" ? "Anúncio" : lead.origem === "SINCRONIZACAO_WHATSAPP" ? "WhatsApp" : "Manual"}
                                           </span>

                                           {pendencias?.naoResolvidas ? (
                                             <span className={cn(
                                               "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium",
                                               getClasseBadgePendencia(pendencias.gravidadeMaxima),
                                             )}>
                                               <AlertTriangle className="h-3.5 w-3.5" />
                                               {pendencias.naoResolvidas} pendência{pendencias.naoResolvidas > 1 ? "s" : ""}
                                             </span>
                                           ) : null}

                                           {lead.quantidade_parcelas ? (
                                             <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/70 px-2.5 py-1 font-medium text-foreground">
                                               <TrendingUp className="h-3.5 w-3.5" />
                                               {lead.quantidade_parcelas} parcelas
                                             </span>
                                           ) : null}
                                         </div>

                                       <div className="mt-3 flex items-center gap-2 text-xs text-foreground-disabled">
                                         {funcionarios.length > 0 && lead.id_funcionario ? (
                                           <span className="flex items-center gap-1">
                                             <Users className="w-3 h-3" />
                                             {funcionarios.find(f => f.id === lead.id_funcionario)?.nome || "Responsável"}
                                           </span>
                                         ) : <span className="flex items-center gap-1 text-warning"><Users className="w-3 h-3" />Sem responsável</span>}
                                         {diasParados > 3 && estagio.tipo !== "GANHO" && estagio.tipo !== "PERDIDO" ? (
                                           <span className="flex items-center gap-1 text-warning">
                                             <Clock className="h-3 w-3" />
                                             {diasParados}d parado
                                           </span>
                                         ) : null}
                                       </div>
                                     </div>
                                     
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
