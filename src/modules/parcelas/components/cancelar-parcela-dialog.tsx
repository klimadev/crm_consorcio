"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formataMoeda } from "@/lib/utils";
import { ROTULOS_MODO_CANCELAMENTO, ROTULOS_STATUS } from "@/lib/financeiro/vocabulario";
import type { Parcela } from "@/lib/api/parcelas";

export type ModoCancelamento = "PONTUAL" | "SUBSEQUENTES";

type CancelarParcelaDialogProps = {
  aberto: boolean;
  parcela: Parcela | null;
  parcelasDoLead: Parcela[];
  cancelando: boolean;
  erro: string | null;
  onOpenChange: (aberto: boolean) => void;
  onConfirmar: (modo: ModoCancelamento, motivo?: string) => Promise<boolean>;
};

function calcularParcelasQueSeraoEncerradas(parcela: Parcela, parcelasDoLead: Parcela[]) {
  return parcelasDoLead
    .filter(
      (item) =>
        item.numero_parcela > parcela.numero_parcela &&
        item.status !== "PAGA" &&
        item.status !== "CANCELADA" &&
        item.status !== "ABORTADA",
    )
    .sort((a, b) => a.numero_parcela - b.numero_parcela);
}

function vibrarSucesso() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([15, 50, 15]);
    }
  } catch {
    // Vibração é um refinamento opcional; falhas são ignoradas.
  }
}

export function CancelarParcelaDialog({
  aberto,
  parcela,
  parcelasDoLead,
  cancelando,
  erro,
  onOpenChange,
  onConfirmar,
}: CancelarParcelaDialogProps) {
  const [modo, setModo] = useState<ModoCancelamento>("PONTUAL");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (aberto) {
      setModo("PONTUAL");
      setMotivo("");
    }
  }, [aberto, parcela?.id]);

  const numeroK = parcela?.numero_parcela ?? 0;
  const subsequentes = parcela ? calcularParcelasQueSeraoEncerradas(parcela, parcelasDoLead) : [];
  const totalEncerrado = subsequentes.reduce((acc, item) => acc + item.valor, 0);

  const confirmar = async () => {
    if (!parcela || cancelando) return;
    const sucesso = await onConfirmar(modo, motivo.trim() ? motivo.trim() : undefined);
    if (sucesso) {
      vibrarSucesso();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={aberto && parcela !== null} onOpenChange={(abertoNovo) => !abertoNovo && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <TriangleAlert className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">Cancelar parcela</DialogTitle>
          <DialogDescription className="text-center">
            Escolha o que fazer com a parcela #{numeroK} de {parcela?.quantidade_total ?? 0}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <RadioGroup value={modo} onValueChange={(valor) => setModo(valor as ModoCancelamento)}>
            <RadioGroupItem value="PONTUAL" disabled={cancelando} textoAcessivel="Cancelar apenas esta parcela">
              <span className="block text-sm font-medium text-foreground">
                {ROTULOS_MODO_CANCELAMENTO.PONTUAL.titulo}
              </span>
              <span className="mt-0.5 block text-xs text-foreground-muted">
                {ROTULOS_MODO_CANCELAMENTO.PONTUAL.descricao}
              </span>
            </RadioGroupItem>
            <RadioGroupItem value="SUBSEQUENTES" disabled={cancelando} textoAcessivel="Cancelar esta parcela e encerrar as futuras">
              <span className="block text-sm font-medium text-foreground">
                {ROTULOS_MODO_CANCELAMENTO.SUBSEQUENTES.titulo}
              </span>
              <span className="mt-0.5 block text-xs text-foreground-muted">
                {ROTULOS_MODO_CANCELAMENTO.SUBSEQUENTES.descricao}
              </span>
            </RadioGroupItem>
          </RadioGroup>

          {modo === "SUBSEQUENTES" ? (
            <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-foreground">
              {subsequentes.length > 0 ? (
                <p>
                  A parcela <strong>#{numeroK}</strong> será <strong>{ROTULOS_STATUS.CANCELADA.rotulo}</strong>. As
                  parcelas{" "}
                  <strong>
                    #{subsequentes[0].numero_parcela} a #{subsequentes[subsequentes.length - 1].numero_parcela}
                  </strong>{" "}
                  serão <strong>{ROTULOS_STATUS.ABORTADA.rotulo}</strong> (total de{" "}
                  <strong>{formataMoeda(totalEncerrado)}</strong> fora da cobrança futura).
                </p>
              ) : (
                <p>
                  A parcela <strong>#{numeroK}</strong> será <strong>{ROTULOS_STATUS.CANCELADA.rotulo}</strong>. Não há
                  parcelas futuras em aberto para encerrar.
                </p>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="motivo-cancelamento-parcela" className="text-sm font-medium text-foreground">
              Motivo <span className="font-normal text-foreground-muted">(opcional)</span>
            </label>
            <Textarea
              id="motivo-cancelamento-parcela"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              maxLength={500}
              placeholder="Ex.: cliente desistiu do consórcio nesta parcela."
              disabled={cancelando}
            />
          </div>

          {erro ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                {erro}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelando}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={cancelando || !parcela}
            className="min-h-[44px]"
          >
            {cancelando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar cancelamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
