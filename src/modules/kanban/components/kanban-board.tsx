"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { formataMoeda } from "@/lib/utils";
import type { Estagio, Lead, PendenciaLeadInfo, Funcionario, ResumoEstagioKanban } from "../types";
import { getClasseBordaGravidade } from "./pendencia-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Trash2, Loader2, FileWarning, Clock, CheckCircle, AlertTriangle, Users, GripVertical, Megaphone, MessageCircle, PenLine, TrendingUp, Send } from "lucide-react";
import { EmptyState } from "./empty-state";
import { TransferenciaCard } from "./transferencia-card";

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
  carregando?: boolean;
  leadsTransferencia?: Lead[];
  idUsuario?: string;
  onAceitarTransferencia?: (leadId: string) => Promise<void>;
  onRecusarTransferencia?: (leadId: string) => Promise<void>;
};

const CARDS_INICIAIS_POR_COLUNA = 12;
const CARDS_POR_LOTE = 10;
const SCROLLBAR_CLEAN =
  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-strong/50 " +
  "[scrollbar-color:rgba(148,163,184,0.45)_transparent] " +
  "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong/50 " +
  "[&::-webkit-scrollbar-track]:bg-transparent";

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

function KanbanBoardSkeleton() {
  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-5", SCROLLBAR_CLEAN)} aria-label="Carregando funil">
      {Array.from({ length: 5 }).map((_, colunaIndex) => (
        <div
          key={colunaIndex}
          className="w-[284px] shrink-0 rounded-3xl border border-border/70 bg-background-surface p-2.5 shadow-sm lg:w-[304px]"
        >
          <div className="mb-2.5 rounded-2xl border border-border/70 bg-background/80 p-2.5">
            <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="h-12 animate-pulse rounded-xl bg-muted/70" />
              <div className="h-12 animate-pulse rounded-xl bg-muted/70" />
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: colunaIndex === 0 ? 4 : 3 }).map((__, cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-2xl border border-border/60 bg-background-elevated p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded-md bg-muted/80" />
                    <div className="h-5 w-28 animate-pulse rounded-md bg-success/15" />
                    <div className="h-12 animate-pulse rounded-xl border border-border/60 bg-background" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                      <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const [elemento, setElemento] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!elemento) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onVisible();
        }
      },
      { rootMargin: "160px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [elemento, onVisible]);

  return <div ref={setElemento} className="h-3" aria-hidden="true" />;
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
  carregando = false,
  leadsTransferencia = [],
  idUsuario,
  onAceitarTransferencia,
  onRecusarTransferencia,
}: KanbanBoardProps) {
  // Sempre usa leadsFiltradosPorEstagio - que já inclui ordenação e é idêntico a leadsPorEstagio quando não há filtros
  const [agoraMs, setAgoraMs] = useState<number | null>(() => typeof window === "undefined" ? null : Date.now());
  const [excluindoIndefinidos, setExcluindoIndefinidos] = useState(false);
  const [cardsVisiveisPorEstagio, setCardsVisiveisPorEstagio] = useState<Record<string, number>>({});
  const leadsDiferidosPorEstagio = useDeferredValue(leadsFiltradosPorEstagio);
  const resumoDiferidoPorEstagio = useDeferredValue(resumoPorEstagio);
  const funcionariosPorId = useMemo(
    () => new Map(funcionarios.map((funcionario) => [funcionario.id, funcionario.nome])),
    [funcionarios],
  );

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

  useEffect(() => {
    setCardsVisiveisPorEstagio((estadoAtual) => {
      const proximoEstado: Record<string, number> = {};

      for (const estagio of estagios) {
        proximoEstado[estagio.id] = estadoAtual[estagio.id] ?? CARDS_INICIAIS_POR_COLUNA;
      }

      return proximoEstado;
    });
  }, [estagios, leadsDiferidosPorEstagio]);

  const carregarMaisCards = useCallback((estagioId: string) => {
    setCardsVisiveisPorEstagio((estadoAtual) => ({
      ...estadoAtual,
      [estagioId]: (estadoAtual[estagioId] ?? CARDS_INICIAIS_POR_COLUNA) + CARDS_POR_LOTE,
    }));
  }, []);

  if (carregando) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={cn("flex gap-3 overflow-x-auto pb-5", SCROLLBAR_CLEAN)}>
          {leadsTransferencia.length > 0 && onAceitarTransferencia && onRecusarTransferencia ? (
            <div
              className={cn(
                "w-[284px] shrink-0 rounded-3xl border border-info/30 bg-info/5 p-2.5 shadow-sm shadow-black/15 lg:w-[304px]",
                "min-h-0 max-h-[calc(100vh-260px)] overflow-y-auto",
                SCROLLBAR_CLEAN,
              )}
            >
              <div className="mb-2.5 rounded-2xl border border-info/20 bg-info/10 px-2.5 py-2">
                <div className="flex items-center gap-2.5">
                  <Send className="h-4 w-4 text-info" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      Transferências Recebidas
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {leadsTransferencia.length} pendente{leadsTransferencia.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {leadsTransferencia.map((lead) => (
                  <TransferenciaCard
                    key={lead.id}
                    lead={lead}
                    onAceitar={onAceitarTransferencia}
                    onRecusar={onRecusarTransferencia}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {estagios.map((estagio) => {
            const leads = leadsDiferidosPorEstagio[estagio.id] ?? [];
            const quantidadeVisivel = Math.min(
              cardsVisiveisPorEstagio[estagio.id] ?? CARDS_INICIAIS_POR_COLUNA,
              leads.length,
            );
            const leadsVisiveis = leads.slice(0, quantidadeVisivel);
            const aindaTemLeads = quantidadeVisivel < leads.length;
            const resumoEstagio = resumoDiferidoPorEstagio[estagio.id];

            return (
             <Droppable key={estagio.id} droppableId={estagio.id}>
               {(provided, snapshot) => (
                     <div
                       className={cn(
                          "w-[284px] shrink-0 rounded-3xl border border-border/70 bg-background-surface p-2.5 shadow-sm shadow-black/15 transition-all duration-300 lg:w-[304px]",
                          getColumnTint(estagio),
                         snapshot.isDraggingOver
                          ? "border-info/35 shadow-md shadow-black/25"
                          : "hover:border-border-strong",
                          "min-h-0 max-h-[calc(100vh-260px)] overflow-y-auto",
                          SCROLLBAR_CLEAN,
                        )}
                     ref={provided.innerRef}
                     {...provided.droppableProps}
                   >
                    <div className="mb-2.5 rounded-2xl border border-border/70 bg-background/80 p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                            getClassePontoEstagio(estagio),
                          )}
                        />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                             {estagio.nome}
                            </p>
                            <p className="text-xs text-foreground-muted">
                              {resumoEstagio?.quantidade ?? leads.length} lead{(resumoEstagio?.quantidade ?? leads.length) !== 1 ? "s" : ""} nesta etapa
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

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-muted/60 px-2.5 py-2">
                          <p className="text-foreground-disabled">Valor</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatarMoedaCompacta(resumoEstagio?.valorTotal ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/60 px-2.5 py-2">
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
                          : "Sem leads parados"}
                      </p>
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
                      leadsVisiveis.map((lead, index) => (
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
                                      lead.id.startsWith("temp-") ? "bg-transparent" : "cursor-pointer rounded-2xl border border-border/70 bg-background-elevated shadow-sm shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md hover:shadow-black/20",
                                     visualCue.border,
                                     getClasseBordaGravidade(pendenciasPorLead[lead.id]?.gravidadeMaxima),
                                     draggableSnapshot.isDragging && "border-info/40 shadow-xl shadow-black/40 scale-[1.02] opacity-95"
                                  )}
                                 onClick={() => {
                                   if (lead.id.startsWith("temp-")) return;
                                   onLeadClick(lead);
                                 }}
                                >
                                  <CardContent className="p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <h3 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                                            {!lead.id.startsWith("temp-") && draggableProvided.dragHandleProps && (
                                              <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-foreground-disabled" />
                                            )}
                                              <span className="truncate">{lead.nome}</span>
                                            </h3>
                                           <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
                                             {agoraMs === null ? "" : formatarTempoRelativo(lead.atualizado_em, agoraMs)}
                                           </span>
                                         </div>

                                          <p className="mt-0.5 text-xs text-foreground-muted">{lead.telefone}</p>

                                          <p className="mt-2 text-lg font-bold text-success">
                                             {lead.valor_consorcio ? formataMoeda(lead.valor_consorcio) : null}
                                          </p>

                                          <div className="mt-2 rounded-xl border border-border/70 bg-background px-2.5 py-2">
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

                                           <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium", getClasseBadgeOrigem(lead.origem))}>
                                             {lead.origem === "ANUNCIO_CTWA" ? <Megaphone className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "SINCRONIZACAO_WHATSAPP" ? <MessageCircle className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "MANUAL" || !lead.origem ? <PenLine className="h-3.5 w-3.5" /> : null}
                                             {lead.origem === "ANUNCIO_CTWA" ? "Anúncio" : lead.origem === "SINCRONIZACAO_WHATSAPP" ? "WhatsApp" : "Manual"}
                                            </span>

                                           {lead.transferencia_pendente &&
                                             lead.transferencia_pendente.status === "PENDENTE" &&
                                             lead.transferencia_pendente.funcionario_origem.id === idUsuario ? (
                                              <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 font-medium text-foreground">
                                                <Send className="h-3 w-3" />
                                                Transferindo...
                                              </span>
                                           ) : null}

                                           {pendencias?.naoResolvidas ? (
                                              <span className={cn(
                                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
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

                                        <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2 text-xs text-foreground-disabled">
                                         {funcionarios.length > 0 && lead.id_funcionario ? (
                                           <span className="flex items-center gap-1">
                                             <Users className="w-3 h-3" />
                                              {funcionariosPorId.get(lead.id_funcionario) || "Responsável"}
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
                    {aindaTemLeads ? (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => carregarMaisCards(estagio.id)}
                          className="w-full rounded-2xl border border-dashed border-border/70 bg-background/60 px-3 py-2 text-xs font-medium text-foreground-muted transition hover:border-border-strong hover:text-foreground"
                        >
                          Mostrar mais {Math.min(CARDS_POR_LOTE, leads.length - quantidadeVisivel)} leads
                        </button>
                        <LoadMoreSentinel onVisible={() => carregarMaisCards(estagio.id)} />
                      </div>
                    ) : null}
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
