import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";

function badgeStatus(status: "PAGO" | "PENDENTE" | "ATRASADO") {
  return {
    PAGO: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDENTE: "border-cyan-200 bg-cyan-50 text-cyan-700",
    ATRASADO: "border-rose-200 bg-rose-50 text-rose-700",
  }[status];
}

type RecebimentosMobileListProps = {
  vm: UseRecebimentosModuleReturn;
};

export function RecebimentosMobileList({ vm }: RecebimentosMobileListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {vm.recebimentos.map((item) => (
        <article key={item.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{item.lead.nome}</p>
              <p className="text-xs text-slate-500">{item.lead.telefone}</p>
            </div>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", badgeStatus(item.status))}>
              {item.status === "PAGO" ? "Recebido" : item.status === "ATRASADO" ? "Atrasado" : "A vencer"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Parcela</p>
              <p className="font-medium text-slate-700">{item.numero_parcela}/{item.quantidade_total}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Valor</p>
              <p className="font-semibold text-slate-900">{formataMoeda(item.valor)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Vencimento</p>
              <p className="text-slate-700">{formataData(item.data_vencimento)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Pagamento</p>
              <p className="text-slate-700">{item.data_pagamento ? formataData(item.data_pagamento) : "-"}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" />
              {item.status === "ATRASADO" ? `${item.dias_em_atraso} dias em atraso` : item.pdv?.nome ?? item.responsavel.nome}
            </div>
            <Button asChild variant="ghost" size="sm" className="text-blue-700 hover:bg-blue-50 hover:text-blue-800">
              <Link href={`/kanban?lead=${item.lead.id}`}>
                <ArrowUpRight className="mr-1 h-4 w-4" />
                Abrir
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
