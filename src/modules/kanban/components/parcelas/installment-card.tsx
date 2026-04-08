import { useState } from "react";
import { CheckCircle2, Loader2, CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formataData, formataMoeda } from "@/lib/utils";
import type { Parcela } from "@/lib/api/parcelas";
import { cn } from "@/lib/utils";

type InstallmentCardProps = {
  parcela: Parcela;
  pagando: boolean;
  onPagar: (idParcela: string, dataPagamento?: string) => void;
  onEditar: (parcela: Parcela) => void;
};

function StatusBadgeParcela({ status }: { status: Parcela["status"] }) {
  const statusUi = {
    PAGO: "bg-success/10 text-success",
    ATRASADO: "bg-destructive/10 text-destructive",
    PENDENTE: "bg-warning/10 text-warning",
  }[status];

  const label = {
    PAGO: "Pago",
    ATRASADO: "Atrasado",
    PENDENTE: "Pendente",
  }[status];

  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusUi)}>{label}</span>;
}

export function InstallmentCard({ parcela, pagando, onPagar, onEditar }: InstallmentCardProps) {
  const [aberto, setAberto] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="group relative rounded-xl border border-border bg-background-surface p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Parcela {parcela.numero_parcela}/{parcela.quantidade_total}
          </p>
          <p className="flex items-center gap-1 text-xs text-foreground-muted">
            <CalendarDays className="h-3 w-3" />
            Vence em: {formataData(parcela.data_vencimento)}
          </p>
        </div>

        <p className="text-sm font-bold text-foreground">{formataMoeda(parcela.valor)}</p>
        <StatusBadgeParcela status={parcela.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border text-foreground-muted hover:bg-muted"
          onClick={() => onEditar(parcela)}
          disabled={pagando}
        >
          <Pencil className="mr-1 h-4 w-4" />
          Editar
        </Button>

        {parcela.status !== "PAGO" ? (
          aberto ? (
            <div className="w-full rounded-xl border border-border bg-muted p-3 sm:w-auto">
              <label className="text-xs font-medium text-foreground-muted">Data do pagamento</label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(event) => setDataPagamento(event.target.value)}
                className="mt-1 h-9 rounded-lg border-border"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
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
                className="text-success hover:bg-success/10 hover:text-success"
              onClick={() => setAberto(true)}
              disabled={pagando}
            >
              {pagando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Marcar como Pago
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
