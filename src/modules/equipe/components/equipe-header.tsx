"use client";

import { ArrowLeft, BriefcaseBusiness, MapPin, Plus, ShieldCheck, UserMinus, Store, Users } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type KpiChipProps = {
  rotulo: string;
  valor: number;
  subtitulo: string;
  className: string;
  icon: ComponentType<{ className?: string }>;
};

function KpiChip({ rotulo, valor, subtitulo, className, icon: Icon }: KpiChipProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", className)}>
      <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-background/20 blur-xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">{rotulo}</p>
          <p className="text-lg font-bold text-foreground">{valor}</p>
          <p className="text-[11px] text-foreground-disabled">{subtitulo}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background-surface">
          <Icon className="h-4 w-4 text-foreground-muted" />
        </div>
      </div>
    </div>
  );
}

type EquipeHeaderProps = {
  vm: UseEquipeModuleReturn;
  onAbrirNovoPdv?: () => void;
  pdvFocado?: UseEquipeModuleReturn["pdvs"][number] | null;
  onVoltarOverview?: () => void;
};

export function EquipeHeader({ vm, onAbrirNovoPdv, pdvFocado, onVoltarOverview }: EquipeHeaderProps) {
  const temFiltrosAtivos = vm.busca || vm.idPdvFiltro || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";
  const kpisExibir = temFiltrosAtivos ? vm.kpis : vm.kpisTotais;
  const colaboradoresAtivos = `${kpisExibir.ativos} ${kpisExibir.ativos === 1 ? "colaborador ativo" : "colaboradores ativos"}`;
  const destaqueGerencia = `${kpisExibir.gerentes} ${kpisExibir.gerentes === 1 ? "gerente" : "gerentes"}`;
  const ehGerente = Boolean(vm.idPdvGerenciado);
  const pdvGerenciado = ehGerente
    ? vm.pdvs.find((pdv) => pdv.id === vm.idPdvGerenciado)?.nome
    : null;
  const contextoDados = pdvGerenciado
    ? `Gestao do PDV: ${pdvGerenciado}`
    : temFiltrosAtivos
      ? "Visao filtrada da equipe"
      : "Visao geral da operacao";

  return (
    <header className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background-surface via-muted/70 to-background shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className={cn("flex flex-col px-4 py-5 md:px-6 md:py-6", pdvFocado ? "gap-4" : "gap-6")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl border border-border bg-background-surface shadow-sm",
              pdvFocado ? "h-10 w-10" : "h-12 w-12"
            )}>
              {pdvFocado ? (
                <Store className="h-5 w-5 text-foreground-muted" />
              ) : (
                <Users className="h-6 w-6 text-foreground-muted" />
              )}
            </div>
            <div className="space-y-1">
              <h1 className={cn("font-semibold tracking-tight text-foreground", pdvFocado ? "text-lg" : "text-xl md:text-2xl")}>
                {pdvFocado ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onVoltarOverview}
                      className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
                      title="Voltar à visão geral"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    Gestão: {pdvFocado.nome}
                  </span>
                ) : (
                  "Equipe e Operacao"
                )}
              </h1>
              <p className="text-sm text-foreground-muted">
                {pdvFocado ? (
                  <>
                    {pdvFocado.funcionarios?.length ?? 0} colaborador(es) ·{" "}
                    {pdvFocado.whatsapp_instancia
                      ? `WhatsApp: ${pdvFocado.whatsapp_instancia.nome}`
                      : "Sem instância WhatsApp"}
                  </>
                ) : (
                  contextoDados
                )}
              </p>
              {!pdvFocado && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    {colaboradoresAtivos}
                  </span>
                  <span className="rounded-full border border-info/25 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
                    {destaqueGerencia}
                  </span>
                  {temFiltrosAtivos ? (
                    <span className="rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                      filtros aplicados
                    </span>
                  ) : null}
                  {pdvGerenciado ? (
                    <span className="rounded-full border border-info/25 bg-info/10 px-2.5 py-1 text-xs font-medium text-info flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {pdvGerenciado}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {vm.podeAdicionarFuncionario ? (
              <Button
                className={cn(
                  "h-10 rounded-xl px-4 font-medium",
                  pdvFocado
                    ? "bg-success text-success-foreground hover:bg-success/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                )}
                onClick={() => vm.abrirDialogNovoFuncionario(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Novo Colaborador
              </Button>
            ) : null}
            {!pdvFocado && vm.podeGerenciarEmpresa && onAbrirNovoPdv ? (
              <Button type="button" variant="outline" className="h-10 rounded-xl border-border bg-background-surface px-4" onClick={onAbrirNovoPdv}>
                <Plus className="mr-2 h-4 w-4" />
                Novo PDV
              </Button>
            ) : null}
          </div>
        </div>

        {!pdvFocado ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <KpiChip rotulo="Total" valor={kpisExibir.total} subtitulo="Time cadastrado" className="border-border bg-background-surface" icon={Users} />
            <KpiChip rotulo="Ativos" valor={kpisExibir.ativos} subtitulo="Em operacao" className="border-success/25 bg-success/10" icon={ShieldCheck} />
            <KpiChip rotulo="Inativos" valor={kpisExibir.inativos} subtitulo="Fora da escala" className="border-destructive/25 bg-destructive/10" icon={UserMinus} />
            <KpiChip rotulo="Gerentes" valor={kpisExibir.gerentes} subtitulo={`${kpisExibir.colaboradores} colaboradores`} className="border-info/25 bg-info/10" icon={BriefcaseBusiness} />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5">
            <MapPin className="h-4 w-4 text-foreground-muted shrink-0" />
            <span className="text-sm text-foreground-muted">
              {pdvFocado.whatsapp_instancia ? (
                <>WhatsApp conectado: <span className="font-medium text-foreground">{pdvFocado.whatsapp_instancia.nome}</span></>
              ) : (
                <span className="text-warning">Sem instância WhatsApp vinculada</span>
              )}
            </span>
            <span className="mx-2 text-foreground-disabled">·</span>
            <span className="text-sm text-foreground-muted">
              <span className="font-medium text-foreground">{kpisExibir.ativos}</span> ativo(s)
              {kpisExibir.gerentes > 0 && (
                <> · <span className="font-medium text-foreground">{kpisExibir.gerentes}</span> gerente(s)</>
              )}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
