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
  const coberturaAtiva = `${kpisExibir.ativos} ${kpisExibir.ativos === 1 ? "ativo" : "ativos"}`;

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
          <Users className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Equipe e Operacao</h1>
          <p className="text-sm text-slate-500">{coberturaAtiva}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <KpiChip rotulo="Total" valor={kpisExibir.total} subtitulo="Time cadastrado" gradiente="border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/80" icon={Users} />
          <KpiChip rotulo="Ativos" valor={kpisExibir.ativos} subtitulo="Em operacao" gradiente="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70" icon={ShieldCheck} />
          <KpiChip rotulo="Inativos" valor={kpisExibir.inativos} subtitulo="Fora da escala" gradiente="border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70" icon={UserMinus} />
          <KpiChip rotulo="Gerentes" valor={kpisExibir.gerentes} subtitulo={`${kpisExibir.colaboradores} colaboradores`} gradiente="border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-100/70" icon={BriefcaseBusiness} />
        </div>

        {!vm.podeGerenciarEmpresa && vm.podeAdicionarFuncionario ? (
          <Button className="rounded-xl bg-blue-600 font-medium text-white hover:bg-blue-500" onClick={() => vm.abrirDialogNovoFuncionario(true)}>
            Novo Colaborador
          </Button>
        ) : null}
        {vm.podeGerenciarEmpresa && onAbrirNovoPdv ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onAbrirNovoPdv}>
            <Plus className="mr-2 h-4 w-4" />
            Novo PDV
          </Button>
        ) : null}
      </div>
    </header>
  );
}
