"use client";

import { Users, UserPlus, Shield, ShieldUser, TrendingUp, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type KpiCardProps = {
  titulo: string;
  valor: number;
  icone: React.ElementType;
  cor: { bg: string; text: string; ring: string };
  tendencia?: { valor: number; positiva: boolean };
};

function KpiCard({ titulo, valor, icone: Icone, cor, tendencia }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className={cn("absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-50", cor.bg)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{titulo}</p>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white/60 backdrop-blur-sm shadow-sm", cor.bg)}>
            <Icone className={cn("h-5 w-5", cor.text)} />
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <p className="text-4xl font-bold text-slate-800">{valor}</p>
          {tendencia && (
            <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", tendencia.positiva ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {tendencia.positiva ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
              {tendencia.valor}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type EquipeHeaderProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeHeader({ vm }: EquipeHeaderProps) {
  const coberturaAtiva = `${vm.kpis.ativos} ${vm.kpis.ativos === 1 ? "ativo" : "ativos"}`;

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
          <Users className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Equipe e Operacao</h1>
          <p className="text-sm text-slate-500">{coberturaAtiva}</p>
        </div>
      </div>

      {vm.podeGerenciarEmpresa ? (
        <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar colaborador
        </Button>
      ) : null}
    </header>
  );
}

type EquipeKpiGridProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeKpiGrid({ vm }: EquipeKpiGridProps) {
  const itensKpi = [
    { titulo: "Total", valor: vm.kpis.total, icone: Users, cor: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" }, tendencia: { valor: 12, positiva: true } },
    { titulo: "Ativos", valor: vm.kpis.ativos, icone: UserCheck, cor: { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-200" }, tendencia: { valor: 8, positiva: true } },
    { titulo: "Inativos", valor: vm.kpis.inativos, icone: UserX, cor: { bg: "bg-rose-100", text: "text-rose-600", ring: "ring-rose-200" }, tendencia: { valor: 3, positiva: false } },
    { titulo: "Gerentes", valor: vm.kpis.gerentes, icone: ShieldUser, cor: { bg: "bg-violet-100", text: "text-violet-600", ring: "ring-violet-200" }, tendencia: { valor: 5, positiva: true } },
    { titulo: "Colaboradores", valor: vm.kpis.colaboradores, icone: Shield, cor: { bg: "bg-blue-100", text: "text-blue-600", ring: "ring-blue-200" }, tendencia: { valor: 2, positiva: true } },
  ] as const;

  if (vm.carregandoLista) {
    return <SkeletonKpiGrid />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {itensKpi.map((item) => (
        <KpiCard
          key={item.titulo}
          titulo={item.titulo}
          valor={item.valor}
          icone={item.icone}
          cor={item.cor}
          tendencia={item.tendencia}
        />
      ))}
    </div>
  );
}

function SkeletonKpiGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="h-3 w-12 rounded bg-slate-200" />
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
          </div>
          <div className="mt-4 h-9 w-16 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
