"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeadParcelas } from "../hooks/use-lead-parcelas";
import { InstallmentCard } from "./parcelas/installment-card";
import { InstallmentGeneratorForm } from "./parcelas/installment-generator-form";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicaMascaraMoedaBr, converteMoedaBrParaNumero, formataMoeda } from "@/lib/utils";
import type { Parcela } from "@/lib/api/parcelas";

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
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [parcelaEmEdicao, setParcelaEmEdicao] = useState<Parcela | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");
  const [dataVencimentoEdicao, setDataVencimentoEdicao] = useState("");

  const abrirEdicao = (parcela: Parcela) => {
    setParcelaEmEdicao(parcela);
    setValorEdicao(aplicaMascaraMoedaBr(String(Math.round(parcela.valor * 100))));
    setDataVencimentoEdicao(parcela.data_vencimento.slice(0, 10));
  };

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
          
          {/* Botão para remover o plano */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setShowRemoveDialog(true)}
              disabled={vm.removendo}
            >
              {vm.removendo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {vm.parcelas.some((parcela) => parcela.status === "PAGO") ? "Remover Pendentes" : "Remover Plano"}
            </Button>
          </div>
          
          <div className="space-y-2">
            {vm.parcelas.map((parcela) => (
              <InstallmentCard
                key={parcela.id}
                  parcela={parcela}
                  pagando={vm.pagando === parcela.id}
                  onPagar={vm.pagarParcela}
                  onEditar={abrirEdicao}
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

      {/* Dialog de confirmação para remover */}
      <ConfirmDialog
        aberto={showRemoveDialog}
        titulo="Remover Plano de Pagamento"
        descricao={
          <p>
            Tem certeza que deseja ajustar o plano de <strong>{vm.parcelas.length} parcelas</strong>?
            <br />
            <span className="text-rose-600">
              {vm.parcelas.some((parcela) => parcela.status === "PAGO")
                ? "As parcelas pendentes serao removidas e os pagamentos ja registrados serao preservados."
                : "Esta ação não pode ser desfeita."}
            </span>
          </p>
        }
        erro={vm.error}
        confirmando={vm.removendo}
        textoConfirmar="Remover"
        textoConfirmando="Removendo..."
        textoCancel="Cancelar"
        onCancelar={() => {
          setShowRemoveDialog(false);
        }}
        onConfirmar={async () => {
          await vm.removerPlano();
          setShowRemoveDialog(false);
        }}
        modo="destrutivo"
        icone={<Trash2 className="h-6 w-6" />}
      />

      <Dialog open={Boolean(parcelaEmEdicao)} onOpenChange={(aberto) => !aberto && setParcelaEmEdicao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar parcela</DialogTitle>
            <DialogDescription>
              Corrija valor ou vencimento da parcela sem perder o historico do lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              {parcelaEmEdicao ? `Parcela ${parcelaEmEdicao.numero_parcela}/${parcelaEmEdicao.quantidade_total} • ${formataMoeda(parcelaEmEdicao.valor)}` : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Valor da parcela</label>
              <Input
                inputMode="numeric"
                value={valorEdicao}
                onChange={(event) => setValorEdicao(aplicaMascaraMoedaBr(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Data de vencimento</label>
              <Input type="date" value={dataVencimentoEdicao} onChange={(event) => setDataVencimentoEdicao(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setParcelaEmEdicao(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!parcelaEmEdicao || vm.salvandoEdicao === parcelaEmEdicao.id}
              onClick={async () => {
                if (!parcelaEmEdicao) return;
                const ok = await vm.editarParcela(parcelaEmEdicao.id, {
                  valor: converteMoedaBrParaNumero(valorEdicao),
                  data_vencimento: dataVencimentoEdicao,
                });
                if (ok) {
                  setParcelaEmEdicao(null);
                }
              }}
            >
              {parcelaEmEdicao && vm.salvandoEdicao === parcelaEmEdicao.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar ajustes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
