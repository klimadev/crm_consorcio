import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MetaModuleItem } from "@/modules/equipe/types/metas";
import { ProgressRing } from "./progress-ring";
import { descreverIndicadorMeta, formatarIndicadorMeta, formatarPeriodoMeta } from "./utils";

type MetaIndividualCardProps = {
  meta: MetaModuleItem;
  podeEditar: boolean;
  desativando: boolean;
  onEditar: (meta: MetaModuleItem) => void;
  onDesativar: (id: string) => void;
};

export function MetaIndividualCard({ meta, podeEditar, desativando, onEditar, onDesativar }: MetaIndividualCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Meta individual</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-slate-900">{meta.funcionario?.nome ?? "Colaborador nao encontrado"}</h3>
          <p className="mt-2 text-sm text-slate-500">{meta.pdv?.nome ?? "Sem PDV"} • {descreverIndicadorMeta(meta)} • {formatarPeriodoMeta(meta)}</p>
        </div>

        <ProgressRing percentual={meta.progresso?.percentual ?? 0} size={96} strokeWidth={10} legenda="atingido" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Meta</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, meta.alvo)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Realizado</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, meta.progresso?.realizado ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Faltante</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, meta.progresso?.faltante ?? meta.alvo)}</p>
        </div>
      </div>

      {podeEditar ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onEditar(meta)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button type="button" variant="destructive" className="rounded-xl" disabled={desativando} onClick={() => onDesativar(meta.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {desativando ? "Desativando..." : "Desativar"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
