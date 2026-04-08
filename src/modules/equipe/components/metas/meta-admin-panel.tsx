"use client";

import { useMemo } from "react";
import { Medal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { MetaModuleItem, RankingMetaModuleItem, UseMetasModuleReturn } from "@/modules/equipe/types/metas";
import { MetaFormDialog } from "./meta-form-dialog";

type MetaAdminPanelProps = {
  vm: UseMetasModuleReturn;
};

type GrupoMetas = UseMetasModuleReturn["metasAgrupadas"][number];

function obterStatus(meta: MetaModuleItem) {
  const percentual = meta.progresso?.percentual ?? 0;

  if (percentual >= 80) {
    return {
      label: percentual >= 100 ? "Meta batida" : "No ritmo",
      badge: "success" as const,
      barra: "bg-success",
      borda: "border-success/25",
      superficie: "border-success/20 bg-success/10",
    };
  }

  if (percentual >= 45) {
    return {
      label: "Atencao",
      badge: "warning" as const,
      barra: "bg-warning",
      borda: "border-warning/25",
      superficie: "border-warning/20 bg-warning/10",
    };
  }

  return {
    label: "Fora do ritmo",
    badge: "error" as const,
    barra: "bg-destructive",
    borda: "border-destructive/25",
    superficie: "border-destructive/20 bg-destructive/10",
  };
}

function formatarIndicador(meta: MetaModuleItem, valor: number) {
  return meta.tipo_meta === "VALOR" ? formataMoeda(valor) : `${Math.round(valor)} contratos`;
}

function labelMedicao(meta: Pick<MetaModuleItem, "tipo_meta" | "origem_resultado">) {
  if (meta.tipo_meta === "VOLUME") {
    return "Contratos fechados";
  }

  return meta.origem_resultado === "ESTAGIO_GANHO" ? "Valor fechado" : "Valor recebido";
}

function semanaDoMesPorData(dataIso: string) {
  const dia = new Date(dataIso).getUTCDate();
  if (dia <= 7) return 1;
  if (dia <= 14) return 2;
  if (dia <= 21) return 3;
  return 4;
}

function numeroSemana(meta: MetaModuleItem) {
  return meta.periodo_item?.semana_do_mes ?? semanaDoMesPorData(meta.data_inicio);
}

function rotuloSemana(meta: MetaModuleItem) {
  return `Semana ${numeroSemana(meta)}`;
}

function subtituloSemana(meta: MetaModuleItem) {
  return meta.periodo_item?.periodo_label?.trim() || `${formataData(meta.data_inicio)} a ${formataData(meta.data_fim)}`;
}

function ordenarMetasPorSemana(metas: MetaModuleItem[]) {
  return [...metas].sort((a, b) => {
    const diferencaSemana = numeroSemana(a) - numeroSemana(b);
    if (diferencaSemana !== 0) return diferencaSemana;
    return new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  });
}

function escolherMetaInicial(metas: MetaModuleItem[]) {
  if (metas.length === 0) return null;

  return [...metas].sort((a, b) => {
    const percentualA = a.progresso?.percentual ?? 0;
    const percentualB = b.progresso?.percentual ?? 0;
    if (percentualA !== percentualB) return percentualA - percentualB;
    return new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  })[0];
}

function CardResumo({ titulo, valor, apoio, destaque }: { titulo: string; valor: string; apoio: string; destaque?: "emerald" | "amber" | "rose" | "blue" }) {
  const mapa = {
    emerald: "border-success/25 bg-success/10 text-foreground",
    amber: "border-warning/25 bg-warning/10 text-foreground",
    rose: "border-destructive/25 bg-destructive/10 text-foreground",
    blue: "border-info/25 bg-info/10 text-foreground",
    default: "border-border bg-background-surface text-foreground",
  };

  return (
    <div className={cn("rounded-[24px] border px-5 py-4", destaque ? mapa[destaque] : mapa.default)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{valor}</p>
      <p className="mt-1 text-sm text-foreground-muted">{apoio}</p>
    </div>
  );
}

function descricaoSaldo(meta: MetaModuleItem) {
  const faltante = meta.progresso?.faltante ?? meta.alvo;

  if (faltante <= 0) {
    return `Superou em ${formatarIndicador(meta, Math.abs(faltante))}`;
  }

  return `Faltam ${formatarIndicador(meta, faltante)}`;
}

function resumoPrazo(diasRestantes: number | undefined) {
  if ((diasRestantes ?? 0) <= 0) {
    return "Encerrando hoje";
  }

  if (diasRestantes === 1) {
    return "1 dia restante";
  }

  return `${diasRestantes ?? 0} dias restantes`;
}

function EstadoVazio({ vm }: { vm: UseMetasModuleReturn }) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[32px] border border-success/25 bg-gradient-to-br from-success/10 via-background-surface to-background px-6 py-8 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">Primeira meta</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Comece criando uma meta simples para a sua equipe.</h2>
          <p className="mt-3 text-sm leading-7 text-foreground-muted">
            Diga um titulo, escolha a equipe e defina o periodo. O painel usa os registros reais do CRM para mostrar o andamento.
          </p>
          {vm.podeCriarMeta ? (
            <Button className="mt-6 rounded-2xl bg-success hover:bg-success/90" onClick={vm.abrirNovaMeta}>
              <Plus className="mr-2 h-4 w-4" />
              Criar a primeira meta
            </Button>
          ) : null}
        </div>
      </div>
      <MetaFormDialog vm={vm} />
    </>
  );
}

function MapaSemanal({ metas, vm }: { metas: MetaModuleItem[]; vm: UseMetasModuleReturn }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {metas.map((meta) => {
        const status = obterStatus(meta);
        const percentual = meta.progresso?.percentual ?? 0;
        const percentualExibido = Math.min(percentual, 100);

        return (
          <article
            key={meta.id}
            className={cn(
              "relative flex min-h-[282px] flex-col overflow-hidden rounded-[24px] border bg-gradient-to-b from-background/90 to-background px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)] transition-colors",
              status.borda,
              status.superficie,
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-1.5", status.barra)} />

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">{rotuloSemana(meta)}</p>
                <p className="mt-1 text-sm font-medium text-foreground-muted">{subtituloSemana(meta)}</p>
              </div>
              <Badge variant={status.badge} dot>
                {status.label}
              </Badge>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-[-0.07em] text-foreground">{percentual.toFixed(0)}%</p>
                <p className="mt-1 text-sm font-medium text-foreground-muted">{labelMedicao(meta)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">Alvo</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatarIndicador(meta, meta.alvo)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-border/70 bg-background/85 px-4 py-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Realizado</p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">{formatarIndicador(meta, meta.progresso?.realizado ?? 0)}</p>
                </div>
                <p className="text-xs font-medium text-foreground-muted">de {formatarIndicador(meta, meta.alvo)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-foreground-muted">
                <span>Saldo</span>
                <span className="font-semibold text-foreground">{descricaoSaldo(meta)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-foreground-muted">
                <span>Prazo</span>
                <span className="font-semibold text-foreground">{resumoPrazo(meta.progresso?.dias_restantes)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-foreground-muted">
                <span>Nome</span>
                <span className="max-w-[65%] truncate text-right font-medium text-foreground">{meta.titulo}</span>
              </div>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted/80">
              <div className={cn("h-full rounded-full transition-all duration-500", status.barra)} style={{ width: `${percentualExibido}%` }} />
            </div>

            <div className="mt-auto pt-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 rounded-xl border-border bg-background/80" onClick={() => vm.abrirEdicao(meta)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-border bg-background/80 text-destructive hover:text-destructive"
                  disabled={vm.desativandoId === meta.id}
                  onClick={() => void vm.desativarMeta(meta.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Arquivar
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PainelEquipeSemanal({ grupo, vm }: { grupo: GrupoMetas; vm: UseMetasModuleReturn }) {
  const metasOrdenadas = useMemo(() => ordenarMetasPorSemana(grupo.metas), [grupo.metas]);
  const metaMaisCritica = escolherMetaInicial(metasOrdenadas);

  if (metasOrdenadas.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-border bg-background-surface p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
      <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.04em] text-foreground">{grupo.nome}</h3>
          <p className="mt-1 text-sm text-foreground-muted">{grupo.metas.length} semana(s) ativas neste ciclo.</p>
        </div>
        {metaMaisCritica ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-medium text-foreground-muted">
            <span className="h-2 w-2 rounded-full bg-warning" />
            Olhar primeiro: {rotuloSemana(metaMaisCritica)}
          </div>
        ) : null}
      </div>

      <MapaSemanal metas={metasOrdenadas} vm={vm} />
    </section>
  );
}

function RankingEquipes({ ranking }: { ranking: RankingMetaModuleItem[] }) {
  return (
    <section className="rounded-[28px] border border-border bg-background-surface p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">Comparativo</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Equipes</h3>
          <p className="mt-2 text-sm text-foreground-muted">Use como referencia rapida. O foco principal continua sendo a leitura semanal acima.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 text-info">
          <Medal className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {ranking.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-sm text-foreground-muted">
            Nenhuma equipe para comparar.
          </div>
        ) : (
          ranking.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold",
                  item.posicao === 1
                    ? "bg-success/10 text-success"
                    : item.posicao === 2
                      ? "bg-info/10 text-info"
                      : "bg-background-surface text-foreground-muted",
                )}
              >
                {item.posicao}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
                  <p className="text-sm font-semibold text-foreground">{item.percentual.toFixed(0)}%</p>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">Realizado {item.realizado.toFixed(0)} | Falta {item.faltante.toFixed(0)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function MetaAdminPanel({ vm }: MetaAdminPanelProps) {
  if (vm.carregando) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-[28px] bg-background-surface" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.65fr]">
          <div className="h-[520px] animate-pulse rounded-[32px] bg-background-surface" />
          <div className="h-[420px] animate-pulse rounded-[32px] bg-background-surface" />
        </div>
      </div>
    );
  }

  if (vm.metasFiltradas.length === 0) {
    return <EstadoVazio vm={vm} />;
  }

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-3">
        <CardResumo titulo="Leitura rapida" valor={`${vm.resumo.equipesNoRitmo} no ritmo`} apoio={`${vm.resumo.equipesEmAtencao} em atencao e ${vm.resumo.equipesForaDoRitmo} fora do ritmo.`} destaque="blue" />
        <CardResumo titulo="Media geral" valor={`${vm.resumo.mediaPercentual.toFixed(0)}%`} apoio="Percentual medio das metas visiveis agora." destaque="emerald" />
        <CardResumo titulo="Equipes visiveis" valor={String(vm.metasAgrupadas.length)} apoio="Cada equipe abre um mapa horizontal com as semanas do mes." />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Mapa semanal</h2>
            <p className="mt-1 text-sm text-foreground-muted">Cada coluna guarda a mesma estrutura para voce comparar semanas sem precisar procurar informacao.</p>
          </div>
          {vm.podeCriarMeta ? (
            <Button className="rounded-2xl bg-foreground hover:bg-foreground/90" onClick={vm.abrirNovaMeta}>
              <Plus className="mr-2 h-4 w-4" />
              Criar meta
            </Button>
          ) : null}
        </div>

        {vm.metasAgrupadas.map((grupo) => (
          <PainelEquipeSemanal key={grupo.id} grupo={grupo} vm={vm} />
        ))}
      </section>

      <RankingEquipes ranking={vm.ranking} />

      <MetaFormDialog vm={vm} />
    </>
  );
}
