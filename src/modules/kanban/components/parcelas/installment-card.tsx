import { useState } from "react";
import { Ban, CheckCircle2, Loader2, CalendarDays, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formataData, formataMoeda, cn } from "@/lib/utils";
import { ROTULOS_STATUS } from "@/lib/financeiro/vocabulario";
import { NotaCobranca } from "@/modules/parcelas/components/nota-cobranca";
import type { Parcela } from "@/lib/api/parcelas";

type InstallmentCardProps = {
  parcela: Parcela;
  pagando: boolean;
  excluindo: boolean;
  cancelando: boolean;
  reabrindo: boolean;
  podeCancelar: boolean;
  podeReabrir: boolean;
  onPagar: (idParcela: string, dataPagamento?: string) => void;
  onEditar: (parcela: Parcela) => void;
  onExcluir: (idParcela: string) => void;
  onCancelar: (parcela: Parcela) => void;
  onReabrir: (idParcela: string) => void;
  onSalvarNota: (idParcela: string, observacao: string | null) => Promise<boolean>;
};

export function InstallmentCard({
  parcela,
  pagando,
  excluindo,
  cancelando,
  reabrindo,
  podeCancelar,
  podeReabrir,
  onPagar,
  onEditar,
  onExcluir,
  onCancelar,
  onReabrir,
  onSalvarNota,
}: InstallmentCardProps) {
  const [aberto, setAberto] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const statusVisual = ROTULOS_STATUS[parcela.status];
  const paga = parcela.status === "PAGA";
  const desativada = parcela.status === "CANCELADA" || parcela.status === "ABORTADA";
  const emAberto = parcela.status === "AGUARDANDO" || parcela.status === "ATRASADA";
  const ocupada = pagando || excluindo || cancelando || reabrindo;

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-background-surface p-4 transition-all duration-200",
        desativada ? "opacity-70" : "hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("text-sm font-semibold text-foreground", desativada && "text-foreground-muted")}>
            Parcela {parcela.numero_parcela}/{parcela.quantidade_total}
          </p>
          <p className="flex items-center gap-1 text-xs text-foreground-muted">
            <CalendarDays className="h-3 w-3" />
            Vence em: {formataData(parcela.data_vencimento)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className={cn("text-sm font-bold text-foreground", desativada && "text-foreground-muted line-through")}>
            {formataMoeda(parcela.valor)}
          </p>
          <Badge
            variant={statusVisual.tom}
          >
            {statusVisual.rotulo}
          </Badge>
        </div>
      </div>

      {desativada && parcela.motivo_cancelamento ? (
        <p className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground-muted">
          Motivo: {parcela.motivo_cancelamento}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {!desativada ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-border text-foreground-muted hover:bg-muted"
            onClick={() => onEditar(parcela)}
            disabled={ocupada}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
        ) : null}

        {emAberto && podeCancelar ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-warning hover:bg-warning/10 hover:text-warning"
            onClick={() => onCancelar(parcela)}
            disabled={ocupada}
          >
            {cancelando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-1 h-4 w-4" />
            )}
            Cancelar parcela…
          </Button>
        ) : null}

        {desativada && podeReabrir ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-info hover:bg-info/10 hover:text-info"
            onClick={() => onReabrir(parcela.id)}
            disabled={ocupada}
          >
            {reabrindo ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-4 w-4" />
            )}
            Reabrir
          </Button>
        ) : null}

        {!paga ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-[44px] min-w-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={ocupada}
            aria-label={`Excluir parcela ${parcela.numero_parcela}`}
          >
            {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        ) : null}

        {emAberto ? (
          aberto ? (
            <div className="w-full rounded-xl border border-border bg-muted p-3 sm:w-auto">
              <label htmlFor={`data-pagamento-${parcela.id}`} className="text-xs font-medium text-foreground-muted">
                Data do pagamento
              </label>
              <Input
                type="date"
                id={`data-pagamento-${parcela.id}`}
                value={dataPagamento}
                onChange={(event) => setDataPagamento(event.target.value)}
                className="mt-1 h-9 rounded-lg border-border"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="min-h-[44px] bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => {
                    onPagar(parcela.id, dataPagamento);
                    setAberto(false);
                  }}
                  disabled={ocupada}
                >
                  {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-[44px]"
                  variant="outline"
                  onClick={() => setAberto(false)}
                  disabled={ocupada}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[44px] min-w-[44px] text-success hover:bg-success/10 hover:text-success"
              onClick={() => setAberto(true)}
              disabled={ocupada}
            >
              {pagando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Marcar como pago
            </Button>
          )
        ) : null}
      </div>

      {emAberto ? (
        <div className="mt-3">
          <NotaCobranca parcela={parcela} podeEditar onSalvar={(observacao) => onSalvarNota(parcela.id, observacao)} />
        </div>
      ) : null}

      <Dialog open={deleteDialogOpen} onOpenChange={(abertoDialog) => !abertoDialog && setDeleteDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir parcela</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta parcela? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={excluindo}
              onClick={() => {
                onExcluir(parcela.id);
                setDeleteDialogOpen(false);
              }}
            >
              {excluindo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
