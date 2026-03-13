import { Badge } from "@/components/ui/badge";
import type { MetaModuleItem, MetaModuleProgresso, RankingMetaModuleItem } from "@/modules/equipe/types/metas";
import { ProgressRing } from "./progress-ring";
import { descreverIndicadorMeta, formatarIndicadorMeta, formatarPeriodoMeta, statusMeta } from "./utils";

type MetaColaboradorCardProps = {
  meta: MetaModuleItem | null;
  progresso: MetaModuleProgresso | null;
  ranking: RankingMetaModuleItem[];
  idUsuario: string;
};

export function MetaColaboradorCard({ meta, progresso, ranking, idUsuario }: MetaColaboradorCardProps) {
  if (!meta || !progresso) {
    return (
      <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Suas metas</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-900">Nenhuma meta ativa no momento</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
          Assim que uma meta individual for definida para voce, este painel passa a mostrar evolucao, tempo restante e sua posicao no ranking do PDV.
        </p>
      </section>
    );
  }

  const selo = statusMeta(progresso.percentual);
  const posicaoAtual = ranking.find((item) => item.id === idUsuario)?.posicao ?? null;

  return (
    <section className="rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Sua meta ativa</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{descreverIndicadorMeta(meta)}</h2>
            <p className="mt-2 text-sm text-slate-500">Periodo {formatarPeriodoMeta(meta)}</p>
          </div>

          <Badge variant={selo.variant} className="w-fit">{selo.emoji} {selo.label}</Badge>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Realizado</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, progresso.realizado)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Meta</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, progresso.meta)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Faltante</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatarIndicadorMeta(meta, progresso.faltante)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Tempo restante</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{progresso.dias_restantes} dias</p>
            </div>
          </div>

          {posicaoAtual ? (
            <p className="text-sm text-slate-600">Sua colocacao atual no ranking do PDV: <span className="font-semibold text-slate-900">{posicaoAtual}o lugar</span>.</p>
          ) : null}
        </div>

        <div className="flex justify-center lg:min-w-[220px]">
          <ProgressRing percentual={progresso.percentual} legenda="evolucao" size={180} strokeWidth={14} />
        </div>
      </div>
    </section>
  );
}
