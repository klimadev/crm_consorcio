"use client";

import { useState } from "react";
import { AlertCircle, Flag, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeadParcelas } from "../hooks/use-lead-parcelas";
import { InstallmentCard } from "./parcelas/installment-card";
import { InstallmentGeneratorForm } from "./parcelas/installment-generator-form";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aplicaMascaraMoedaBr, converteMoedaBrParaNumero, descreveDataRelativa, formataMoeda } from "@/lib/utils";
import { obterParcelasEmAberto } from "@/lib/financeiro/parcelas";
import type { Parcela } from "@/lib/api/parcelas";
import { CancelarParcelaDialog } from "@/modules/parcelas/components/cancelar-parcela-dialog";
import { EncerrarPlanoDialog } from "@/modules/parcelas/components/encerrar-plano-dialog";

type LeadParcelasTabProps = {
  leadId: string;
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
};

function ParcelasResumo({ parcelas }: { parcelas: { valor: number; status: string }[] }) {
  const pagas = parcelas.filter((p) => p.status === "PAGA");
  const emAberto = parcelas.filter((p) => p.status === "AGUARDANDO" || p.status === "ATRASADA");
  const totalPago = pagas.reduce((acc, p) => acc + p.valor, 0);
  const totalAberto = emAberto.reduce((acc, p) => acc + p.valor, 0);
  const base = totalPago + totalAberto;
  const progresso = base > 0 ? (totalPago / base) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-background-surface p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground-muted">Progresso</span>
        <span className="font-semibold text-foreground">
          {pagas.length}/{pagas.length + emAberto.length} parcelas
        </span>
      </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
           className="h-full rounded-full bg-success transition-all duration-500"
           style={{ width: `${progresso}%` }}
         />
       </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-foreground-muted">Total</p>
          <p className="font-semibold text-foreground">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(base)}
          </p>
        </div>
        <div>
          <p className="text-xs text-success">Pago</p>
          <p className="font-semibold text-success">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPago)}
          </p>
        </div>
        <div>
          <p className="text-xs text-warning">Em aberto</p>
          <p className="font-semibold text-warning">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalAberto)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeadParcelasTab({ leadId, perfil }: LeadParcelasTabProps) {
  const vm = useLeadParcelas({ leadId });
  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [parcelaParaCancelar, setParcelaParaCancelar] = useState<Parcela | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");
  const [parcelaEmEdicao, setParcelaEmEdicao] = useState<Parcela | null>(null);
  const [dataVencimentoEdicao, setDataVencimentoEdicao] = useState("");

  const parcelasEmAberto = obterParcelasEmAberto(vm.parcelas);
  const podeGerirPlano = perfil !== "COLABORADOR";
  const podeEncerrar = parcelasEmAberto.length > 0 && podeGerirPlano;

  // Onde o plano parou: a primeira cancelada por número (o gatilho do
  // encerramento). A cascata inteira carrega o mesmo motivo.
  const primeiraCancelada = vm.parcelas
    .filter((parcela) => parcela.status === "CANCELADA")
    .sort((a, b) => a.numero_parcela - b.numero_parcela)[0];

  const abrirEdicao = (parcela: Parcela) => {
    setParcelaEmEdicao(parcela);
    setValorEdicao(aplicaMascaraMoedaBr(String(Math.round(parcela.valor * 100))));
    setDataVencimentoEdicao(parcela.data_vencimento.slice(0, 10));
  };

  if (vm.loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-background-surface">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
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

          {primeiraCancelada ? (
            <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Flag className="h-4 w-4 shrink-0 text-warning" />
                Plano encerrado na parcela #{primeiraCancelada.numero_parcela}
              </p>
              {primeiraCancelada.motivo_cancelamento ? (
                <p className="mt-1 text-xs text-foreground-muted">Motivo: {primeiraCancelada.motivo_cancelamento}</p>
              ) : null}
              {primeiraCancelada.cancelado_em ? (
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Encerrado {descreveDataRelativa(primeiraCancelada.cancelado_em)} · reabra uma parcela para voltar à cobrança
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end">
            {podeEncerrar ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[44px] text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => setEncerrarAberto(true)}
                disabled={vm.removendo || vm.cancelandoParcela !== null}
              >
                <Flag className="mr-2 h-4 w-4" />
                Encerrar plano
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            {vm.parcelas.map((parcela) => (
              <InstallmentCard
                key={parcela.id}
                  parcela={parcela}
                  pagando={vm.pagando === parcela.id}
                  excluindo={vm.deletandoParcela === parcela.id}
                  cancelando={vm.cancelandoParcela === parcela.id}
                  reabrindo={vm.reabrindoParcela === parcela.id}
                  podeCancelar={podeGerirPlano}
                  podeReabrir={podeGerirPlano}
                  onPagar={vm.pagarParcela}
                  onEditar={abrirEdicao}
                  onExcluir={vm.excluirParcela}
                  onCancelar={setParcelaParaCancelar}
                  onReabrir={vm.reabrirParcela}
                  onSalvarNota={vm.salvarObservacao}
                />
              ))}
            </div>
        </>
      )}

      {vm.error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {vm.error}
          </p>
        </div>
      ) : null}

      <EncerrarPlanoDialog
        aberto={encerrarAberto}
        parcelas={vm.parcelas}
        encerrando={vm.cancelandoParcela !== null}
        erro={vm.error}
        onOpenChange={setEncerrarAberto}
        onEncerrar={(idParcelaParada, motivo) => vm.cancelarParcela(idParcelaParada, "SUBSEQUENTES", motivo)}
        onExcluirRegistro={() => setExcluirAberto(true)}
      />

      {/* Exclusão técnica: só para correção de cadastro errado. O encerramento
          acima é o caminho de negócio; aqui apaga registro de verdade. */}
      {vm.parcelas.some((p) => p.status === "PAGA") && podeGerirPlano ? (
        <Dialog open={excluirAberto} onOpenChange={(a) => !a && setExcluirAberto(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <TriangleAlert className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Excluir registro do plano</DialogTitle>
              <DialogDescription className="text-center">
                O plano tem <strong>{vm.parcelas.length} parcelas</strong>, incluindo pagamentos registrados. Isso é
                correção de cadastro, não evento de negócio: prefira encerrar o plano.
              </DialogDescription>
            </DialogHeader>

            {vm.error ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {vm.error}
                </p>
              </div>
            ) : null}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] w-full"
                disabled={vm.removendo}
                onClick={async () => {
                  await vm.removerPlano(false);
                  setExcluirAberto(false);
                }}
              >
                Manter pagas e remover pendentes
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-[44px] w-full"
                disabled={vm.removendo}
                onClick={async () => {
                  await vm.removerPlano(true);
                  setExcluirAberto(false);
                }}
              >
                {vm.removendo ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Excluir tudo (inclui pagas)
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-[44px] w-full"
                disabled={vm.removendo}
                onClick={() => setExcluirAberto(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          aberto={excluirAberto}
          titulo="Excluir registro do plano"
          descricao={
            <p>
              Tem certeza que deseja excluir o registro de <strong>{vm.parcelas.length} parcelas</strong>?
              <br />
              <span className="text-destructive">Esta ação não pode ser desfeita. Para eventos de negócio, prefira encerrar o plano.</span>
            </p>
          }
          erro={vm.error}
          confirmando={vm.removendo}
          textoConfirmar="Excluir registro"
          textoConfirmando="Excluindo..."
          textoCancel="Cancelar"
          onCancelar={() => setExcluirAberto(false)}
          onConfirmar={async () => {
            await vm.removerPlano(false);
            setExcluirAberto(false);
          }}
          modo="destrutivo"
          icone={<Trash2 className="h-6 w-6" />}
        />
      )}

      <Dialog open={Boolean(parcelaEmEdicao)} onOpenChange={(aberto) => !aberto && setParcelaEmEdicao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar parcela</DialogTitle>
            <DialogDescription>
              Corrija valor ou vencimento da parcela sem perder o histórico do lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted p-3 text-sm text-foreground-muted">
              {parcelaEmEdicao ? `Parcela ${parcelaEmEdicao.numero_parcela}/${parcelaEmEdicao.quantidade_total} • ${formataMoeda(parcelaEmEdicao.valor)}` : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="edicao-valor-parcela" className="text-sm font-medium text-foreground">
                Valor da parcela
              </label>
              <Input
                id="edicao-valor-parcela"
                inputMode="numeric"
                value={valorEdicao}
                onChange={(event) => setValorEdicao(aplicaMascaraMoedaBr(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edicao-data-vencimento" className="text-sm font-medium text-foreground">
                Data de vencimento
              </label>
              <Input
                id="edicao-data-vencimento"
                type="date"
                value={dataVencimentoEdicao}
                onChange={(event) => setDataVencimentoEdicao(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setParcelaEmEdicao(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-success text-success-foreground hover:bg-success/90"
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

      <CancelarParcelaDialog
        aberto={parcelaParaCancelar !== null}
        parcela={parcelaParaCancelar}
        parcelasDoLead={vm.parcelas}
        cancelando={parcelaParaCancelar !== null && vm.cancelandoParcela === parcelaParaCancelar.id}
        erro={vm.error}
        onOpenChange={(aberto) => !aberto && setParcelaParaCancelar(null)}
        onConfirmar={async (modo, motivo) => {
          if (!parcelaParaCancelar) return false;
          return vm.cancelarParcela(parcelaParaCancelar.id, modo, motivo);
        }}
      />
    </div>
  );
}
