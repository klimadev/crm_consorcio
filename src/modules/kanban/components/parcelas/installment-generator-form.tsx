import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InstallmentGeneratorFormProps = {
  valorTotal: string;
  onValorTotalChange: (valor: string) => void;
  quantidadeParcelas: string;
  onQuantidadeParcelasChange: (valor: string) => void;
  dataPrimeiroVencimento: string;
  onDataPrimeiroVencimentoChange: (valor: string) => void;
  gerando: boolean;
  onGerarPlano: () => void;
};

export function InstallmentGeneratorForm({
  valorTotal,
  onValorTotalChange,
  quantidadeParcelas,
  onQuantidadeParcelasChange,
  dataPrimeiroVencimento,
  onDataPrimeiroVencimentoChange,
  gerando,
  onGerarPlano,
}: InstallmentGeneratorFormProps) {
  const valorNumero = Number(valorTotal.replace(/\D/g, "")) / 100;
  const qtdParcelas = Number(quantidadeParcelas) || 0;
  const valorPorParcela = qtdParcelas > 0 && valorNumero > 0 ? valorNumero / qtdParcelas : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Gerar Plano de Pagamento</h3>
      <p className="mt-1 text-xs text-slate-500">Defina o valor total e quantidade de parcelas.</p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Valor Total</label>
          <Input
            value={valorTotal}
            onChange={(event) => onValorTotalChange(event.target.value)}
            placeholder="0,00"
            inputMode="numeric"
            className="h-10 rounded-xl border-slate-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Quantidade de Parcelas</label>
          <Input
            type="number"
            min={1}
            max={360}
            value={quantidadeParcelas}
            onChange={(event) => onQuantidadeParcelasChange(event.target.value)}
            placeholder="Ex.: 60"
            className="h-10 rounded-xl border-slate-200"
          />
        </div>

        {valorPorParcela > 0 && qtdParcelas > 0 && (
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-xs text-emerald-600">Valor de cada parcela</p>
            <p className="text-lg font-bold text-emerald-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorPorParcela)}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Data do 1o Vencimento</label>
          <Input
            type="date"
            value={dataPrimeiroVencimento}
            onChange={(event) => onDataPrimeiroVencimentoChange(event.target.value)}
            className="h-10 rounded-xl border-slate-200"
          />
        </div>

        <Button
          type="button"
          onClick={onGerarPlano}
          disabled={gerando || !valorTotal || !quantidadeParcelas}
          className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {gerando ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando plano...
            </span>
          ) : (
            "Gerar Plano de Pagamento"
          )}
        </Button>
      </div>
    </div>
  );
}
