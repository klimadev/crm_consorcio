import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import type { UseRecebimentosModuleReturn } from "../types";

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
  return (
    <div className="space-y-3 md:hidden">
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

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <Clock3 className="h-4 w-4" />
              {item.status === "ATRASADO" ? `${item.dias_em_atraso} dias em atraso` : item.pdv?.nome ?? item.responsavel.nome}
            </div>
            <Button asChild variant="ghost" size="sm" className="text-info hover:bg-info/10 hover:text-info">
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
