"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useLeadParcelas } from "../hooks/use-lead-parcelas";
import { InstallmentCard } from "./parcelas/installment-card";
import { InstallmentGeneratorForm } from "./parcelas/installment-generator-form";

type LeadParcelasTabProps = {
  leadId: string;
};

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
          valorParcela={vm.valorParcela}
          onValorParcelaChange={vm.setValorParcela}
          quantidadeParcelas={vm.quantidadeParcelas}
          onQuantidadeParcelasChange={vm.setQuantidadeParcelas}
          dataPrimeiroVencimento={vm.dataPrimeiroVencimento}
          onDataPrimeiroVencimentoChange={vm.setDataPrimeiroVencimento}
          gerando={vm.gerando}
          onGerarPlano={vm.gerarPlano}
        />
      ) : (
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
