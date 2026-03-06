import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formataData, formataMoeda, cn } from "@/lib/utils";
import type { ParcelaComLead } from "@/lib/api/parcelas";

type ParcelaListItemProps = {
  parcela: ParcelaComLead;
  onPagar: (id: string, dataPagamento?: string) => void;
  pagando: boolean;
};

function labelStatus(status: ParcelaComLead["status"]) {
  if (status === "PAGO") return { texto: "Pago", classe: "bg-emerald-100 text-emerald-700" };
  if (status === "ATRASADO") return { texto: "Atrasado", classe: "bg-rose-100 text-rose-700" };
  return { texto: "Pendente", classe: "bg-amber-100 text-amber-700" };
}

export function ParcelaListItem({ parcela, onPagar, pagando }: ParcelaListItemProps) {
  const badge = labelStatus(parcela.status);
  const iniciais = parcela.lead.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {iniciais || <UserRound className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{parcela.lead.nome}</p>
            <p className="text-xs text-slate-500">
              Parcela {parcela.numero_parcela}/{parcela.quantidade_total} - {formataData(parcela.data_vencimento)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{formataMoeda(parcela.valor)}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", badge.classe)}>{badge.texto}</span>
          {parcela.status !== "PAGO" ? (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onPagar(parcela.id)}
              disabled={pagando}
            >
              {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
