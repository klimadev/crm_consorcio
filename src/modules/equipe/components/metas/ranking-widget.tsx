import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RankingMetaModuleItem } from "@/modules/equipe/types/metas";
import { cn } from "@/lib/utils";

type RankingWidgetProps = {
  ranking: RankingMetaModuleItem[];
  mediaEquipe: number;
  totalParticipantes: number;
  destaqueId?: string;
  titulo?: string;
};

export function RankingWidget({
  ranking,
  mediaEquipe,
  totalParticipantes,
  destaqueId,
  titulo = "Ranking da equipe",
}: RankingWidgetProps) {
  const itens = ranking.slice(0, 5);

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Comparativo</p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-900">{titulo}</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Badge variant="info" size="sm">Media {mediaEquipe.toFixed(1)}%</Badge>
        <span>{totalParticipantes} participantes</span>
      </div>

      <div className="mt-5 space-y-2">
        {itens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
            O ranking aparece assim que existirem metas individuais ativas no periodo.
          </div>
        ) : (
          itens.map((item) => {
            const destaque = item.id === destaqueId;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors",
                  destaque ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200/70 bg-slate-50/70",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    item.posicao <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700",
                  )}>
                    {item.posicao}o
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.nome}</p>
                    {destaque ? <p className="text-xs text-emerald-600">Voce esta aqui</p> : null}
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">{item.percentual.toFixed(1)}%</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
