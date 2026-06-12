"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MetaWeekCard } from "@/modules/metas/components/meta-week-card";
import type { Meta } from "@/modules/metas/types";
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

  // Mapa de meta por (equipeId, semana)
  const mapa = new Map<string, Meta>();
  for (const [, metas] of metasPorEquipe) {
    for (const meta of metas) {
      mapa.set(`${meta.id_equipe}_${meta.semana}`, meta);
    }
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
          <>
            {SEMANAS.map((semana) => {
              const [firstEquipeId] = equipes.keys();
              const meta = firstEquipeId ? mapa.get(`${firstEquipeId}_${semana}`) : undefined;
              return meta ? (
                <MetaWeekCard
                  key={`${firstEquipeId}_${semana}`}
                  meta={meta}
                  onEditar={onEditarMeta}
                  onArquivar={onArquivarMeta}
                />
              ) : (
                <EmptyWeekSlot
                  key={`${firstEquipeId}_${semana}`}
                  semana={semana}
                  mesReferencia={mesReferencia}
                  onCriar={() => onCriarMeta(firstEquipeId ?? "", semana)}
                />
              );
            })}
          </>
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
                    const meta = metas.find((m) => m.semana === semana);
                    return meta ? (
                      <MetaWeekCard
                        key={meta.id}
                        meta={meta}
                        onEditar={onEditarMeta}
                        onArquivar={onArquivarMeta}
                      />
                    ) : (
                      <EmptyWeekSlot
                        key={`${equipeId}_s${semana}`}
                        semana={semana}
                        mesReferencia={mesReferencia}
                        onCriar={() => onCriarMeta(equipeId, semana)}
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

function EmptyWeekSlot({ semana, mesReferencia, onCriar }: { semana: number; mesReferencia: string; onCriar: () => void; }) {
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
      <Button variant="outline" size="sm" className="mt-1" onClick={onCriar}>
        <Plus className="mr-1 h-3 w-3" />
        Criar
      </Button>
    </div>
  );
}
