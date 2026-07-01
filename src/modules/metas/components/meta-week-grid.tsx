"use client";

import { useMemo } from "react";
import { Edit2, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formataMoeda } from "@/lib/utils";
import { MetaWeekCard } from "@/modules/metas/components/meta-week-card";
import type { Meta } from "@/modules/metas/types";
import { agregarProgressoEquipe } from "@/modules/metas/lib/calculator";
import { calcularDatasSemana } from "@/modules/metas/lib/dates";

type Props = {
  metasPorEquipe: Map<string, Meta[]>;
  mesReferencia: string;
  equipeSelecionada: string | null;
  onCriarMeta: (equipe: string, semana: number) => void;
  onEditarMeta: (meta: Meta) => void;
  onArquivarMeta: (id: string) => void;
};

const SEMANAS = [1, 2, 3, 4];

export function MetaWeekGrid({
  metasPorEquipe,
  mesReferencia,
  equipeSelecionada,
  onCriarMeta,
  onEditarMeta,
  onArquivarMeta,
}: Props) {
  // Filtra por equipe se houver seleção
  const equipes = equipeSelecionada
    ? metasPorEquipe.has(equipeSelecionada)
      ? new Map([[equipeSelecionada, metasPorEquipe.get(equipeSelecionada)!]])
      : new Map()
    : metasPorEquipe;

  // Agrupa metas por (equipeId, semana), retornando Meta[] por slot
  const metasPorSlot = useMemo(() => {
    const mapa = new Map<string, Meta[]>();
    for (const [equipeId, metas] of metasPorEquipe) {
      for (const meta of metas) {
        const key = `${meta.id_equipe}_${meta.semana}`;
        if (!mapa.has(key)) mapa.set(key, []);
        mapa.get(key)!.push(meta);
      }
    }
    return mapa;
  }, [metasPorEquipe]);

  if (equipes.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-foreground-muted">Nenhuma meta encontrada para este período.</p>
        <Button variant="outline" className="mt-4" onClick={() => onCriarMeta("", 1)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar primeira meta
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-foreground-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-success" /> No ritmo (≥80%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Atenção (≥45%)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Fora (&lt;45%)
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {equipes.size <= 1 ? (
          // Grade de semanas para uma equipe
          <SingleTeamGrid
            equipes={equipes}
            metasPorSlot={metasPorSlot}
            mesReferencia={mesReferencia}
            onCriarMeta={onCriarMeta}
            onEditarMeta={onEditarMeta}
            onArquivarMeta={onArquivarMeta}
          />
        ) : (
          // Múltiplas equipes: cada equipe ocupa uma linha com 4 colunas
          <>
            {Array.from(equipes.entries()).map(([equipeId, metas]) => (
              <div key={equipeId} className="col-span-1 sm:col-span-2 lg:col-span-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {metas[0]?.equipe?.nome ?? "Equipe"}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {SEMANAS.map((semana) => {
                    const key = `${equipeId}_${semana}`;
                    const slotMetas = metasPorSlot.get(key);
                    return (
                      <SlotContent
                        key={key}
                        equipeId={equipeId}
                        semana={semana}
                        metas={slotMetas ?? []}
                        mesReferencia={mesReferencia}
                        onCriarMeta={onCriarMeta}
                        onEditarMeta={onEditarMeta}
                        onArquivarMeta={onArquivarMeta}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Renderiza as 4 semanas de UMA equipe inline (sem label de equipe) */
function SingleTeamGrid({
  equipes,
  metasPorSlot,
  mesReferencia,
  onCriarMeta,
  onEditarMeta,
  onArquivarMeta,
}: {
  equipes: Map<string, Meta[]>;
  metasPorSlot: Map<string, Meta[]>;
  mesReferencia: string;
  onCriarMeta: (equipe: string, semana: number) => void;
  onEditarMeta: (meta: Meta) => void;
  onArquivarMeta: (id: string) => void;
}) {
  const [firstEquipeId] = equipes.keys();

  return (
    <>
      {SEMANAS.map((semana) => {
        const key = firstEquipeId ? `${firstEquipeId}_${semana}` : "";
        const slotMetas = key ? metasPorSlot.get(key) : undefined;
        return (
          <SlotContent
            key={key || semana}
            equipeId={firstEquipeId ?? ""}
            semana={semana}
            metas={slotMetas ?? []}
            mesReferencia={mesReferencia}
            onCriarMeta={onCriarMeta}
            onEditarMeta={onEditarMeta}
            onArquivarMeta={onArquivarMeta}
          />
        );
      })}
    </>
  );
}

/** Slot de semana: mostra metas empilhadas ou slot vazio */
function SlotContent({
  equipeId,
  semana,
  metas,
  mesReferencia,
  onCriarMeta,
  onEditarMeta,
  onArquivarMeta,
}: {
  equipeId: string;
  semana: number;
  metas: Meta[];
  mesReferencia: string;
  onCriarMeta: (equipe: string, semana: number) => void;
  onEditarMeta: (meta: Meta) => void;
  onArquivarMeta: (id: string) => void;
}) {
  if (metas.length === 0) {
    return (
      <EmptyWeekSlot
        semana={semana}
        mesReferencia={mesReferencia}
        onCriar={() => onCriarMeta(equipeId, semana)}
      />
    );
  }

  if (metas.length === 1) {
    // Card grande normal
    return (
      <MetaWeekCard
        meta={metas[0]}
        onEditar={onEditarMeta}
        onArquivar={onArquivarMeta}
      />
    );
  }

  // Múltiplas metas: card unificado que agrupa todas as metas da semana
  return (
    <UnifiedWeekCard
      equipeId={equipeId}
      semana={semana}
      metas={metas}
      mesReferencia={mesReferencia}
      onCriarMeta={onCriarMeta}
      onEditarMeta={onEditarMeta}
      onArquivarMeta={onArquivarMeta}
    />
  );
}

/** Card unificado para semanas com 2+ metas — mostra tudo em 1 card */
function UnifiedWeekCard({
  equipeId,
  semana,
  metas,
  mesReferencia,
  onCriarMeta,
  onEditarMeta,
  onArquivarMeta,
}: {
  equipeId: string;
  semana: number;
  metas: Meta[];
  mesReferencia: string;
  onCriarMeta: (equipe: string, semana: number) => void;
  onEditarMeta: (meta: Meta) => void;
  onArquivarMeta: (id: string) => void;
}) {
  const datas = calcularDatasSemana(semana, mesReferencia);
  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" });

  const metasComProgresso = metas.filter((m) => m.progresso);
  const resumo = agregarProgressoEquipe(metasComProgresso);

  // Determina status geral da semana (pior meta determina o tom)
  const piorStatus = metasComProgresso.reduce((pior, m) => {
    const s = m.progresso?.status ?? "fora";
    if (s === "fora") return "fora";
    if (s === "atencao" && pior !== "fora") return "atencao";
    return pior;
  }, "no_ritmo" as string);

  const bordaStatus =
    piorStatus === "no_ritmo" ? "border-success/30" :
    piorStatus === "atencao" ? "border-warning/30" :
    "border-destructive/30";

  return (
    <div className={cn("flex flex-col rounded-2xl border", bordaStatus, "bg-background-surface overflow-hidden")}>
      {/* === HEADER === */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-foreground">S{semana}</span>
          <span className="text-[10px] text-foreground-muted whitespace-nowrap">
            {formatDate(datas.data_inicio)} — {formatDate(datas.data_fim)}
          </span>
          {/* Status dots */}
          <span className="flex items-center gap-1 ml-1">
            {metasComProgresso.length > 0 ? (
              metasComProgresso.map((m) => (
                <span
                  key={m.id}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    m.progresso?.status === "no_ritmo" && "bg-success",
                    m.progresso?.status === "atencao" && "bg-warning",
                    m.progresso?.status === "fora" && "bg-destructive",
                  )}
                />
              ))
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-foreground-disabled" />
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={() => onCriarMeta(equipeId, semana)}
          title="Adicionar meta"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* === METAS ROWS === */}
      <div className="divide-y divide-border/50">
        {metas.map((meta) => {
          const p = meta.progresso;
          const status = p?.status ?? "fora";
          return (
            <div
              key={meta.id}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
            >
              {/* Status dot */}
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  status === "no_ritmo" && "bg-success",
                  status === "atencao" && "bg-warning",
                  status === "fora" && "bg-destructive",
                )}
              />

              {/* Meta info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-foreground">
                    {meta.titulo || (meta.tipo_meta === "VOLUME" ? "Contratos" : meta.origem === "PAGAMENTOS" ? "Recebido" : "Fechado")}
                  </span>
                  {meta.tipo_meta === "VOLUME" && (
                    <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-foreground-muted uppercase tracking-wider">VOL</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-foreground-muted tabular-nums">
                  {meta.tipo_meta === "VOLUME"
                    ? `${p?.realizado ?? 0} / ${meta.alvo} contratos`
                    : `${formataMoeda(p?.realizado ?? 0)} / ${formataMoeda(meta.alvo)}`}
                </p>
              </div>

              {/* Barra progresso + percentual */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      status === "no_ritmo" && "bg-success",
                      status === "atencao" && "bg-warning",
                      status === "fora" && "bg-destructive",
                    )}
                    style={{ width: `${Math.min(p?.percentual ?? 0, 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "min-w-[2.5rem] text-right text-xs font-bold tabular-nums",
                    status === "no_ritmo" && "text-success",
                    status === "atencao" && "text-warning",
                    status === "fora" && "text-destructive",
                  )}
                >
                  {p?.percentual ?? 0}%
                </span>
              </div>

              {/* Ações hover */}
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onEditarMeta(meta)}
                  title="Editar"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-foreground-muted hover:text-destructive"
                  onClick={() => onArquivarMeta(meta.id)}
                  title="Arquivar"
                >
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* === FOOTER === */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <p className="text-[10px] text-foreground-muted">
          <span className="font-medium tabular-nums">{metasComProgresso.length}</span> meta{metasComProgresso.length !== 1 && "s"}
          {resumo.total_metas > 0 && (
            <>
              {" · "}média <span className="font-medium tabular-nums">{resumo.media_percentual.toFixed(0)}%</span>
              {resumo.no_ritmo > 0 && <span> · <span className="text-success">{resumo.no_ritmo}</span> no ritmo</span>}
              {resumo.atencao > 0 && <span> · <span className="text-warning">{resumo.atencao}</span> atenção</span>}
              {resumo.fora > 0 && <span> · <span className="text-destructive">{resumo.fora}</span> fora</span>}
            </>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-foreground-muted hover:text-foreground"
          onClick={() => onCriarMeta(equipeId, semana)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Nova
        </Button>
      </div>
    </div>
  );
}

function EmptyWeekSlot({
  semana,
  mesReferencia,
  onCriar,
}: {
  semana: number;
  mesReferencia: string;
  onCriar: () => void;
}) {
  const datas = calcularDatasSemana(semana, mesReferencia);
  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" });

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50">
      <span className="text-xs font-medium text-foreground-muted">Semana {semana}</span>
      <span className="text-xs text-foreground-muted">
        {formatDate(datas.data_inicio)} — {formatDate(datas.data_fim)}
      </span>
      <span className="text-sm text-foreground-disabled">Sem meta</span>
      <p className="text-[10px] text-foreground-muted leading-tight text-center max-w-[160px]">
        Adicione metas de valor, volume ou ambos
      </p>
      <Button variant="outline" size="sm" className="mt-1" onClick={onCriar}>
        <Plus className="mr-1 h-3 w-3" />
        Criar
      </Button>
    </div>
  );
}
