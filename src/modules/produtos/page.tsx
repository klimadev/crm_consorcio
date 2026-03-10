"use client";

import { ArrowUpRight, Boxes, PackageCheck, PackagePlus } from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProdutosCatalogo } from "./hooks/use-produtos-catalogo";
import { ProdutosLista } from "./components/produtos-lista";
import type { ProdutosPageInitialState } from "./types";

type ModuloProdutosProps = {
  estadoInicial: ProdutosPageInitialState;
};

export function ModuloProdutos({ estadoInicial }: ModuloProdutosProps) {
  const vm = useProdutosCatalogo(estadoInicial);

  return (
    <ModulePageShell spacing="lg" className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.06),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_18%,_#f8fafc_100%)]">
      <ModulePageHeader
        title="Produtos internos"
        subtitle="Monte formularios internos claros e reutilizaveis para o time anexar no lead sem precisar aprender uma ferramenta complexa."
        icon={<Boxes className="h-6 w-6" />}
        iconTone="emerald"
        badges={[
          <Badge key="lead" variant="success">Uso no lead</Badge>,
          <Badge key="ativos" variant="secondary">{vm.totalAtivos} ativos</Badge>,
        ]}
        actions={
          <Button onClick={vm.abrirCriacao} className="min-w-44 gap-2 rounded-2xl bg-emerald-600 px-5 text-white shadow-sm hover:bg-emerald-700 sm:min-w-52">
            <PackagePlus className="mr-2 h-4 w-4" />
            Novo produto
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.86fr)]">
        <Card className="overflow-hidden rounded-[1.85rem] border-slate-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Basico</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">Campos</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">Revisao</span>
                </div>
                <p className="text-sm text-slate-500">Catalogo simples, edicao em tela dedicada e preview em tempo real.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-3 text-center shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Fluxo</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">3</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-3 text-center shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Ativos</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{vm.totalAtivos}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-3 text-center shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Media</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{vm.mediaCamposPorProduto}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[1.85rem] border-slate-200/80 bg-[linear-gradient(160deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96),_rgba(240,253,250,0.9))] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6 xl:grid-cols-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Boxes className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Templates</p>
                <p className="text-2xl font-semibold text-slate-950">{vm.totalProdutos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <PackageCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ativos</p>
                <p className="text-2xl font-semibold text-slate-950">{vm.totalAtivos}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Media por template</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{vm.mediaCamposPorProduto}</p>
              <p className="text-xs text-slate-500">campos organizados por produto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {vm.erro ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{vm.erro}</div> : null}

      <ProdutosLista vm={vm} />
    </ModulePageShell>
  );
}
