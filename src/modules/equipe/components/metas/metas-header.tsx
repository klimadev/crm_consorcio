"use client";

import { Building2, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetasHeaderProps = {
  vm: UseMetasModuleReturn;
};

export function MetasHeader({ vm }: MetasHeaderProps) {
  const mostrarSeletorPdv = vm.perfil === "EMPRESA" && vm.opcoesPdvs.length > 1;
  const equipeAtual = vm.opcoesPdvs.find((pdv) => pdv.id === (vm.pdvSelecionado ?? vm.opcoesPdvs[0]?.id));

  return (
    <div className="overflow-hidden rounded-[32px] border border-emerald-100 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_38%),linear-gradient(135deg,_#f8fffb,_#ffffff_56%,_#eefaf5)] px-6 py-6">
        <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Metas da equipe</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">Metas por equipe</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="rounded-2xl border-slate-200 bg-white/90" onClick={() => void vm.recarregar()} disabled={vm.carregando}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>

            {vm.podeCriarMeta ? (
              <Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={vm.abrirNovaMeta}>
                <Plus className="mr-2 h-4 w-4" />
                Nova meta
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-emerald-100 bg-white px-6 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {mostrarSeletorPdv ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filtrar equipe</p>
              <Select value={vm.pdvSelecionado ?? "todas"} onValueChange={(value) => vm.setPdvSelecionado(value === "todas" ? null : value)}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 md:w-[260px]">
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as equipes</SelectItem>
                  {vm.opcoesPdvs.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Equipe em foco</p>
                <p className="text-sm font-semibold text-emerald-950">{equipeAtual?.nome ?? "Todas as equipes"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Equipes</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{vm.resumo.totalEquipes}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">No ritmo</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-emerald-950">{vm.resumo.equipesNoRitmo}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-blue-700">Media geral</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-blue-950">{vm.resumo.mediaPercentual.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> No ritmo</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Atencao</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Fora do ritmo</span>
      </div>
    </div>
  );
}
