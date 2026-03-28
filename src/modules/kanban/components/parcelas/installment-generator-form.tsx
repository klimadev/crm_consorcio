import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerWithWarning } from "@/components/ui/date-picker";
import { formataData } from "@/lib/utils";

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

function gerarDatasPreview(dataInicial: Date, quantidade: number): Date[] {
  const datas: Date[] = [];
  const diaOriginal = dataInicial.getDate();

  for (let i = 0; i < Math.min(quantidade, 6); i += 1) {
    const data = new Date(dataInicial);
    data.setDate(1);
    data.setMonth(data.getMonth() + i);

    const ultimoDiaDoMes = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
    data.setDate(Math.min(diaOriginal, ultimoDiaDoMes));
    datas.push(data);
  }

  return datas;
}

function DataPreview({ dataPrimeira, quantidade }: { dataPrimeira: string; quantidade: number }) {
  if (!dataPrimeira || !quantidade) return null;

  const dataPrimeiraDate = new Date(dataPrimeira + "T00:00:00");
  if (isNaN(dataPrimeiraDate.getTime())) return null;

  const datas = gerarDatasPreview(dataPrimeiraDate, Number(quantidade));
  if (datas.length === 0) return null;

  const quantidadeNum = Number(quantidade);
  const restantes = quantidadeNum > 6 ? quantidadeNum - 6 : 0;

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">Datas de vencimento:</p>
      <div className="flex flex-wrap gap-1.5">
        {datas.map((data, idx) => (
          <span
            key={idx}
            className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
          >
            {formataData(data.toISOString())}
          </span>
        ))}
        {restantes > 0 && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            +{restantes} mais
          </span>
        )}
      </div>
    </div>
  );
}

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

  const isFormValid = valorTotal && quantidadeParcelas && dataPrimeiroVencimento && qtdParcelas > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Gerar Plano de Pagamento</h3>
      <p className="mt-1 text-xs text-slate-500">Defina o valor total, quantidade de parcelas e primeira data de vencimento.</p>

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
          <label className="text-xs font-medium text-slate-600">Data do 1° Vencimento</label>
          <DatePickerWithWarning
            value={dataPrimeiroVencimento}
            onChange={onDataPrimeiroVencimentoChange}
            warningMessage="Atenção: data no passado. Parcelas serão geradas com vencimentos retroativos."
          />
          <p className="text-xs text-slate-400">As parcelas vencerão todo dia {dataPrimeiroVencimento ? new Date(dataPrimeiroVencimento + "T00:00:00").getDate() : "..."} de cada mês</p>
        </div>

        {/* Preview das datas */}
        {isFormValid && <DataPreview dataPrimeira={dataPrimeiroVencimento} quantidade={qtdParcelas} />}

        <Button
          type="button"
          onClick={onGerarPlano}
          disabled={gerando || !isFormValid}
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
