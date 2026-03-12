import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";

function StatusBadge({ status }: { status: "PAGO" | "PENDENTE" | "ATRASADO" }) {
  const estilos = {
    PAGO: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDENTE: "border-cyan-200 bg-cyan-50 text-cyan-700",
    ATRASADO: "border-rose-200 bg-rose-50 text-rose-700",
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
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="border-b border-slate-200/70 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Operacao detalhada</h2>
        <p className="text-xs text-slate-500">Acompanhe cada recebimento e navegue rapidamente para o lead no Kanban.</p>
      </div>

      <Table>
        <TableHeader className="sticky top-0 bg-slate-50/80">
          <TableRow className="hover:bg-slate-50/80">
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
                  <p className="font-medium text-slate-900">{item.lead.nome}</p>
                  <p className="text-xs text-slate-500">{item.lead.telefone}</p>
                </div>
              </TableCell>
              <TableCell className="py-4 text-slate-600">{item.numero_parcela}/{item.quantidade_total}</TableCell>
              <TableCell className="py-4 text-slate-600">{formataData(item.data_vencimento)}</TableCell>
              <TableCell className="py-4 text-slate-600">{item.data_pagamento ? formataData(item.data_pagamento) : "-"}</TableCell>
              <TableCell className="py-4 font-semibold text-slate-800">{formataMoeda(item.valor)}</TableCell>
              <TableCell className="py-4">
                <div className="space-y-1">
                  <StatusBadge status={item.status} />
                  {item.status === "ATRASADO" ? <p className="text-[11px] text-rose-600">{item.dias_em_atraso} dias em atraso</p> : null}
                </div>
              </TableCell>
              <TableCell className="py-4 text-slate-600">{item.pdv?.nome ?? "-"}</TableCell>
              <TableCell className="py-4 text-slate-600">{item.responsavel.nome}</TableCell>
              <TableCell className="py-4 text-right">
                <Button asChild variant="ghost" size="sm" className="text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                  <Link href={`/kanban?lead=${item.lead.id}`}>
                    <ArrowUpRight className="mr-1 h-4 w-4" />
                    Abrir lead
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-200/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-500">Pagina {vm.pagina} de {vm.totalPaginas}</p>

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
    </section>
  );
}
