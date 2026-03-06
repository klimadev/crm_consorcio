"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useLeadParcelas } from "../hooks/use-lead-parcelas";
import { InstallmentCard } from "./parcelas/installment-card";
import { InstallmentGeneratorForm } from "./parcelas/installment-generator-form";

type LeadParcelasTabProps = {
  leadId: string;
};

function ParcelasResumo({ parcelas }: { parcelas: { valor: number; status: string }[] }) {
  const total = parcelas.reduce((acc, p) => acc + p.valor, 0);
  const pago = parcelas.filter((p) => p.status === "PAGO").reduce((acc, p) => acc + p.valor, 0);
  const pendente = total - pago;
  const progresso = total > 0 ? (pago / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-600">Progresso</span>
        <span className="font-semibold text-slate-800">
          {parcelas.filter((p) => p.status === "PAGO").length}/{parcelas.length} parcelas
        </span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-slate-500">Total</p>
          <p className="font-semibold text-slate-800">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-emerald-600">Pago</p>
          <p className="font-semibold text-emerald-600">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pago)}
          </p>
        </div>
        <div>
          <p className="text-xs text-amber-600">Pendente</p>
          <p className="font-semibold text-amber-600">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pendente)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeadParcelasTab({ leadId }: LeadParcelasTabProps) {
  const vm = useLeadParcelas({ leadId });

  if (vm.loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!vm.temParcelas ? (
        <InstallmentGeneratorForm
          valorTotal={vm.valorTotal}
          onValorTotalChange={vm.setValorTotal}
          quantidadeParcelas={vm.quantidadeParcelas}
          onQuantidadeParcelasChange={vm.setQuantidadeParcelas}
          dataPrimeiroVencimento={vm.dataPrimeiroVencimento}
          onDataPrimeiroVencimentoChange={vm.setDataPrimeiroVencimento}
          gerando={vm.gerando}
          onGerarPlano={vm.gerarPlano}
        />
      ) : (
        <>
          <ParcelasResumo parcelas={vm.parcelas} />
          <div className="space-y-2">
            {vm.parcelas.map((parcela) => (
              <InstallmentCard
                key={parcela.id}
                parcela={parcela}
                pagando={vm.pagando === parcela.id}
                onPagar={vm.pagarParcela}
              />
            ))}
          </div>
        </>
      )}

      {vm.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {vm.error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
