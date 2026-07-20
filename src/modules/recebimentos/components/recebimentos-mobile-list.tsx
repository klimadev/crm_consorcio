import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function badgeStatus(status: "PAGO" | "PENDENTE" | "ATRASADO") {
  return {
    PAGO: "border-success/25 bg-success/10 text-success",
    PENDENTE: "border-info/25 bg-info/10 text-info",
    ATRASADO: "border-destructive/20 bg-destructive/10 text-destructive",
  }[status];
}

type RecebimentosMobileListProps = {
  vm: UseRecebimentosModuleReturn;
};

export function RecebimentosMobileList({ vm }: RecebimentosMobileListProps) {
  const [pagamentoAberto, setPagamentoAberto] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <><div className="space-y-3 md:hidden">
      {vm.recebimentos.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border bg-background-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{item.lead.nome}</p>
              <p className="text-xs text-foreground-muted">{item.lead.telefone}</p>
            </div>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", badgeStatus(item.status))}>
              {item.status === "PAGO" ? "Recebido" : item.status === "ATRASADO" ? "Atrasado" : "A vencer"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-foreground-muted">Parcela</p>
              <p className="font-medium text-foreground">{item.numero_parcela}/{item.quantidade_total}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-foreground-muted">Valor</p>
              <p className="font-semibold text-foreground">{formataMoeda(item.valor)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-foreground-muted">Vencimento</p>
              <p className="text-foreground">{formataData(item.data_vencimento)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-foreground-muted">Pagamento</p>
              <p className="text-foreground">{item.data_pagamento ? formataData(item.data_pagamento) : "-"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <Clock3 className="h-4 w-4" />
              {item.status === "ATRASADO" ? `${item.dias_em_atraso} dias em atraso` : item.pdv?.nome ?? item.responsavel.nome}
            </div>

            {vm.pagando === item.id ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando pagamento...
              </div>
            ) : item.status === "PAGO" ? (
              <Button asChild variant="ghost" size="sm" className="w-full text-info hover:bg-info/10 hover:text-info">
                <Link href={`/kanban?lead=${item.lead.id}`}>
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                  Abrir lead
                </Link>
              </Button>
            ) : pagamentoAberto === item.id ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
                <label className="text-xs font-medium text-foreground-muted">Data do pagamento</label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(event) => setDataPagamento(event.target.value)}
                  className="h-9 rounded-lg border-border"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => {
                      const dataIso = new Date(dataPagamento + "T00:00:00").toISOString();
                      void vm.pagarParcela(item.id, dataIso);
                      setPagamentoAberto(null);
                    }}
                  >
                    Confirmar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPagamentoAberto(null)}
                    disabled={vm.pagando !== null}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-success hover:bg-success/10 hover:text-success"
                  onClick={() => {
                    setDataPagamento(hojeIso());
                    setPagamentoAberto(item.id);
                  }}
                  disabled={vm.pagando !== null || vm.deletando !== null}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Marcar como Pago
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteConfirmId(item.id)}
                  disabled={vm.pagando !== null || vm.deletando !== null}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-info hover:bg-info/10 hover:text-info">
                  <Link href={`/kanban?lead=${item.lead.id}`}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(aberto) => !aberto && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir parcela</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta parcela? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={vm.deletando !== null}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={vm.deletando !== null}
              onClick={async () => {
                if (!deleteConfirmId) return;
                await vm.deletarParcela(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
            >
              {vm.deletando === deleteConfirmId ? (
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
    </>
  );
}
