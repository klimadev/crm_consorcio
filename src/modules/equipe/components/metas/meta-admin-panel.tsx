"use client";

import { AlertCircle, CheckCircle2, Medal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetaFormDialog } from "./meta-form-dialog";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { MetaModuleItem, RankingMetaModuleItem, UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetaAdminPanelProps = {
  vm: UseMetasModuleReturn;
};

function obterStatus(meta: MetaModuleItem) {
  const percentual = meta.progresso?.percentual ?? 0;

  if (percentual >= 80) {
    return {
      label: percentual >= 100 ? "Meta batida" : "No ritmo",
      descricao: percentual >= 100 ? "A equipe ja entregou o alvo desse periodo." : "O andamento esta saudavel para fechar esse periodo.",
      badge: "success" as const,
      barra: "bg-emerald-500",
      fundo: "from-emerald-50 via-white to-lime-50",
      borda: "border-emerald-100",
      icone: CheckCircle2,
    };
  }

  if (percentual >= 45) {
    return {
      label: "Atencao",
      descricao: "Vale acompanhar mais de perto para nao apertar no fim do periodo.",
      badge: "warning" as const,
      barra: "bg-amber-500",
      fundo: "from-amber-50 via-white to-orange-50",
      borda: "border-amber-100",
      icone: AlertCircle,
    };
  }

  return {
    label: "Fora do ritmo",
    descricao: "Precisa de acao rapida para aproximar a equipe da meta.",
    badge: "error" as const,
    barra: "bg-rose-500",
    fundo: "from-rose-50 via-white to-white",
    borda: "border-rose-100",
    icone: AlertCircle,
  };
}

function formatarIndicador(meta: MetaModuleItem, valor: number) {
  return meta.tipo_meta === "VALOR" ? formataMoeda(valor) : `${Math.round(valor)} contratos`;
}

function labelMedicao(meta: Pick<MetaModuleItem, "tipo_meta" | "origem_resultado">) {
  if (meta.tipo_meta === "VOLUME") {
    return "Volume - fechados";
  }

  return meta.origem_resultado === "ESTAGIO_GANHO" ? "Valor - fechados" : "Valor - pagamentos";
}

function labelPeriodo(periodo: MetaModuleItem["periodo"]) {
  switch (periodo) {
    case "MENSAIS":
      return "Mensal";
    case "TRIMESTRAL":
      return "Trimestral";
    case "ANUAL":
      return "Anual";
    case "PERSONALIZADO":
      return "Livre";
    default:
      return "Semanal";
  }
}

function CardResumo({ titulo, valor, apoio, destaque }: { titulo: string; valor: string; apoio: string; destaque?: "emerald" | "amber" | "rose" | "blue" }) {
  const mapa = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-950",
    amber: "border-amber-100 bg-amber-50 text-amber-950",
    rose: "border-rose-100 bg-rose-50 text-rose-950",
    blue: "border-blue-100 bg-blue-50 text-blue-950",
    default: "border-slate-200 bg-white text-slate-950",
  };

  return (
    <div className={cn("rounded-[26px] border px-5 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.4)]", destaque ? mapa[destaque] : mapa.default)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{valor}</p>
      <p className="mt-2 text-sm text-slate-600">{apoio}</p>
    </div>
  );
}

function EstadoVazio({ vm }: { vm: UseMetasModuleReturn }) {
  return (
    <>
      <div className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(135deg,_#ffffff,_#f3fbf7_58%,_#ecfdf5)] px-6 py-8 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.32)]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Primeira meta</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Comece criando uma meta simples para a sua equipe.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Diga um titulo, escolha a equipe e defina o periodo. O painel usa os registros reais do CRM para mostrar o andamento.
          </p>
          {vm.podeCriarMeta ? (
            <Button className="mt-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={vm.abrirNovaMeta}>
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

function CardMetaEquipe({ meta, vm }: { meta: MetaModuleItem; vm: UseMetasModuleReturn }) {
  const status = obterStatus(meta);
  const percentual = Math.min(meta.progresso?.percentual ?? 0, 100);
  const Icone = status.icone;

  return (
    <article className={cn("overflow-hidden rounded-[28px] border bg-gradient-to-br p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.38)]", status.borda, status.fundo)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.badge} dot>{status.label}</Badge>
            <Badge variant="secondary">{labelMedicao(meta)}</Badge>
            <Badge variant="default">{labelPeriodo(meta.periodo)}</Badge>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{meta.titulo}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{meta.pdv?.nome ?? "Equipe"}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{status.descricao}</p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-2xl border-white/80 bg-white/80" onClick={() => vm.abrirEdicao(meta)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl border-white/80 bg-white/80 text-rose-700 hover:text-rose-800" disabled={vm.desativandoId === meta.id} onClick={() => void vm.desativarMeta(meta.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Meta</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatarIndicador(meta, meta.alvo)}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Realizado</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatarIndicador(meta, meta.progresso?.realizado ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Falta</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatarIndicador(meta, meta.progresso?.faltante ?? meta.alvo)}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Periodo</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formataData(meta.data_inicio)} ate {formataData(meta.data_fim)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/80 bg-white/90 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Icone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{(meta.progresso?.percentual ?? 0).toFixed(0)}% da meta concluida</p>
              <p className="text-sm text-slate-500">{meta.progresso?.dias_restantes ?? 0} dia(s) restantes no periodo</p>
            </div>
          </div>

          <div className="text-sm font-medium text-slate-600">
            {meta.progresso?.realizado ?? 0} de {meta.alvo}
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className={cn("h-full rounded-full transition-all duration-500", status.barra)} style={{ width: `${percentual}%` }} />
        </div>
      </div>
    </article>
  );
}

function RankingEquipes({ ranking }: { ranking: RankingMetaModuleItem[] }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Comparativo</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Equipes</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Medal className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {ranking.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Nenhuma equipe para comparar.
          </div>
        ) : (
          ranking.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold", item.posicao === 1 ? "bg-emerald-100 text-emerald-900" : item.posicao === 2 ? "bg-blue-100 text-blue-900" : "bg-slate-200 text-slate-700")}>{item.posicao}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-950">{item.nome}</p>
                  <p className="text-sm font-semibold text-slate-700">{item.percentual.toFixed(0)}%</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Realizado {item.realizado.toFixed(0)} | Falta {item.faltante.toFixed(0)}</p>
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
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-[28px] bg-white" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="h-[420px] animate-pulse rounded-[32px] bg-white" />
          <div className="h-[420px] animate-pulse rounded-[32px] bg-white" />
        </div>
      </div>
    );
  }

  if (vm.metasFiltradas.length === 0) {
    return <EstadoVazio vm={vm} />;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        <CardResumo titulo="Equipes com meta" valor={String(vm.resumo.totalEquipes)} apoio="Todas as equipes com meta ativa nesta visualizacao." destaque="blue" />
        <CardResumo titulo="No ritmo" valor={String(vm.resumo.equipesNoRitmo)} apoio="Andamento bom para fechar o periodo." destaque="emerald" />
        <CardResumo titulo="Atencao" valor={String(vm.resumo.equipesEmAtencao)} apoio="Vale acompanhar antes do fim do periodo." destaque="amber" />
        <CardResumo titulo="Fora do ritmo" valor={String(vm.resumo.equipesForaDoRitmo)} apoio="Precisa de ajuda rapida para reagir." destaque="rose" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_0.62fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">Metas organizadas por equipe</h2>
            </div>
            {vm.podeCriarMeta ? (
              <Button className="rounded-2xl bg-slate-950 hover:bg-slate-800" onClick={vm.abrirNovaMeta}>
                <Plus className="mr-2 h-4 w-4" />
                Criar meta
              </Button>
            ) : null}
          </div>

          {vm.metasAgrupadas.map((grupo) => (
            <section key={grupo.id} className="space-y-3 rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)]">
              <div className="px-1">
                <h3 className="text-lg font-semibold text-slate-950">{grupo.nome}</h3>
                <p className="text-sm text-slate-500">{grupo.metas.length} meta(s) cadastrada(s)</p>
              </div>

              {grupo.metas.map((meta) => (
                <CardMetaEquipe key={meta.id} meta={meta} vm={vm} />
              ))}
            </section>
          ))}
        </section>

        <div className="space-y-5 xl:sticky xl:top-4 xl:h-fit">
          <RankingEquipes ranking={vm.ranking} />
        </div>
      </div>

      <MetaFormDialog vm={vm} />
    </>
  );
}
