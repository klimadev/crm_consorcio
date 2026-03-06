import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formataData, formataMoeda } from "@/lib/utils";
import type { Parcela } from "@/lib/api/parcelas";
import { cn } from "@/lib/utils";

type InstallmentCardProps = {
  parcela: Parcela;
  pagando: boolean;
  onPagar: (idParcela: string, dataPagamento?: string) => void;
};

function StatusBadgeParcela({ status }: { status: Parcela["status"] }) {
  const statusUi = {
    PAGO: "bg-emerald-100 text-emerald-700",
    ATRASADO: "bg-rose-100 text-rose-700",
    PENDENTE: "bg-amber-100 text-amber-700",
  }[status];

  const label = {
    PAGO: "Pago",
    ATRASADO: "Atrasado",
    PENDENTE: "Pendente",
  }[status];

  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusUi)}>{label}</span>;
}

export function InstallmentCard({ parcela, pagando, onPagar }: InstallmentCardProps) {
  const [aberto, setAberto] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Parcela {parcela.numero_parcela}/{parcela.quantidade_total}
          </p>
          <p className="text-xs text-slate-500">Vencimento: {formataData(parcela.data_vencimento)}</p>
        </div>

        <p className="text-sm font-bold text-slate-800">{formataMoeda(parcela.valor)}</p>
        <StatusBadgeParcela status={parcela.status} />
      </div>

      {parcela.status !== "PAGO" ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {aberto ? (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 sm:w-auto">
              <label className="text-xs font-medium text-slate-600">Data do pagamento</label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(event) => setDataPagamento(event.target.value)}
                className="mt-1 h-9 rounded-lg border-slate-200"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    onPagar(parcela.id, dataPagamento);
                    setAberto(false);
                  }}
                  disabled={pagando}
                >
                  {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setAberto(false)} disabled={pagando}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => setAberto(true)}
              disabled={pagando}
            >
              {pagando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Marcar como Pago
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
