"use client";

import { BriefcaseBusiness, Plus, ShieldCheck, UserMinus, Users } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type KpiChipProps = {
  rotulo: string;
  valor: number;
  subtitulo: string;
  gradiente: string;
  icon: ComponentType<{ className?: string }>;
};

function KpiChip({ rotulo, valor, subtitulo, gradiente, icon: Icon }: KpiChipProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", gradiente)}>
      <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20 blur-xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">{rotulo}</p>
          <p className="text-lg font-bold text-slate-900">{valor}</p>
          <p className="text-[11px] text-slate-500">{subtitulo}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/60">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

type EquipeHeaderProps = {
  vm: UseEquipeModuleReturn;
  onAbrirNovoPdv?: () => void;
};

export function EquipeHeader({ vm, onAbrirNovoPdv }: EquipeHeaderProps) {
  const temFiltrosAtivos = vm.busca || vm.idPdvFiltro || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";
  const kpisExibir = temFiltrosAtivos ? vm.kpis : vm.kpisTotais;
  const colaboradoresAtivos = `${kpisExibir.ativos} ${kpisExibir.ativos === 1 ? "colaborador ativo" : "colaboradores ativos"}`;
  const contextoDados = temFiltrosAtivos ? "Visao filtrada da equipe" : "Visao geral da operacao";
  const destaqueGerencia = `${kpisExibir.gerentes} ${kpisExibir.gerentes === 1 ? "gerente" : "gerentes"}`;

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50/70 to-slate-100/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">Equipe e Operacao</h1>
              <p className="text-sm text-slate-600">{contextoDados}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {colaboradoresAtivos}
                </span>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                  {destaqueGerencia}
                </span>
                {temFiltrosAtivos ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    filtros aplicados
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!vm.podeGerenciarEmpresa && vm.podeAdicionarFuncionario ? (
              <Button className="h-10 rounded-xl bg-emerald-600 px-4 font-medium text-white hover:bg-emerald-500" onClick={() => vm.abrirDialogNovoFuncionario(true)}>
                Novo Colaborador
              </Button>
            ) : null}
            {vm.podeGerenciarEmpresa && onAbrirNovoPdv ? (
              <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-300 bg-white/90 px-4" onClick={onAbrirNovoPdv}>
                <Plus className="mr-2 h-4 w-4" />
                Novo PDV
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiChip rotulo="Total" valor={kpisExibir.total} subtitulo="Time cadastrado" gradiente="border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/90" icon={Users} />
          <KpiChip rotulo="Ativos" valor={kpisExibir.ativos} subtitulo="Em operacao" gradiente="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70" icon={ShieldCheck} />
          <KpiChip rotulo="Inativos" valor={kpisExibir.inativos} subtitulo="Fora da escala" gradiente="border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70" icon={UserMinus} />
          <KpiChip rotulo="Gerentes" valor={kpisExibir.gerentes} subtitulo={`${kpisExibir.colaboradores} colaboradores`} gradiente="border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-100/70" icon={BriefcaseBusiness} />
        </div>
      </div>
    </header>
  );
}
