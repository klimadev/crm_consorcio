import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: "PAGO" | "PENDENTE" | "ATRASADO" }) {
  const estilos = {
    PAGO: "border-success/25 bg-success/10 text-success",
    PENDENTE: "border-info/25 bg-info/10 text-info",
    ATRASADO: "border-destructive/20 bg-destructive/10 text-destructive",
  }[status];

  const label = {
    PAGO: "Recebido",
    PENDENTE: "A vencer",
    ATRASADO: "Atrasado",
  }[status];

  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", estilos)}>{label}</span>;
}

type RecebimentosTableProps = {
  vm: UseRecebimentosModuleReturn;
};

export function RecebimentosTable({ vm }: RecebimentosTableProps) {
  const [pagamentoAberto, setPagamentoAberto] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(hojeIso());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Operacao detalhada</h2>
        <p className="text-xs text-foreground-muted">Acompanhe cada recebimento, registre pagamentos e navegue para o lead no Kanban.</p>
      </div>

      <Table className="min-w-[860px]">
        <TableHeader className="sticky top-0 bg-background-surface">
          <TableRow className="hover:bg-muted/50">
            <TableHead>Lead</TableHead>
            <TableHead>Parcela</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>PDV</TableHead>
            <TableHead>Responsavel</TableHead>
            <TableHead className="text-right">Acao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.recebimentos.map((item) => (
            <TableRow key={item.id} className="group">
              <TableCell className="py-4">
                <div>
                  <p className="font-medium text-foreground">{item.lead.nome}</p>
                  <p className="text-xs text-foreground-muted">{item.lead.telefone}</p>
                </div>
              </TableCell>
               <TableCell className="py-4 text-foreground-muted">{item.numero_parcela}/{item.quantidade_total}</TableCell>
               <TableCell className="py-4 text-foreground-muted">{formataData(item.data_vencimento)}</TableCell>
               <TableCell className="py-4 text-foreground-muted">{item.data_pagamento ? formataData(item.data_pagamento) : "-"}</TableCell>
               <TableCell className="py-4 font-semibold text-foreground">{formataMoeda(item.valor)}</TableCell>
              <TableCell className="py-4">
                <div className="space-y-1">
                  <StatusBadge status={item.status} />
                   {item.status === "ATRASADO" ? <p className="text-[11px] text-destructive">{item.dias_em_atraso} dias em atraso</p> : null}
                </div>
              </TableCell>
               <TableCell className="py-4 text-foreground-muted">{item.pdv?.nome ?? "-"}</TableCell>
               <TableCell className="py-4 text-foreground-muted">{item.responsavel.nome}</TableCell>
              <TableCell className="py-4 text-right">
                {vm.pagando === item.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-success" />
                    <span className="text-xs text-foreground-muted">Registrando...</span>
                  </div>
                ) : item.status === "PAGO" ? (
                  <Button asChild variant="ghost" size="sm" className="text-info hover:bg-info/10 hover:text-info">
                    <Link href={`/kanban?lead=${item.lead.id}`}>
                      <ArrowUpRight className="mr-1 h-4 w-4" />
                      Abrir lead
                    </Link>
                  </Button>
                ) : pagamentoAberto === item.id ? (
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Input
                      type="date"
                      value={dataPagamento}
                      onChange={(event) => setDataPagamento(event.target.value)}
                      className="h-8 w-32 rounded-lg border-border"
                    />
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
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-success hover:bg-success/10 hover:text-success"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-foreground-muted">Pagina {vm.pagina} de {vm.totalPaginas}</p>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => vm.irParaPagina(Math.max(1, vm.pagina - 1))} disabled={vm.pagina <= 1}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => vm.irParaPagina(Math.min(vm.totalPaginas, vm.pagina + 1))} disabled={vm.pagina >= vm.totalPaginas}>
            Proxima
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
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
    </section>
  );
}
