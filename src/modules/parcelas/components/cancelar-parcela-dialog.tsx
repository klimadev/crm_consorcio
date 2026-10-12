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

function calcularParcelasQueSeraoAbortadas(parcela: Parcela, parcelasDoLead: Parcela[]) {
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
    // Vibracao e um refinamento opcional; falhas sao ignoradas.
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
  const subsequentes = parcela ? calcularParcelasQueSeraoAbortadas(parcela, parcelasDoLead) : [];
  const totalAbortado = subsequentes.reduce((acc, item) => acc + item.valor, 0);

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
          <DialogTitle className="text-center">Cancelar Parcela</DialogTitle>
          <DialogDescription className="text-center">
            Escolha o alcance do cancelamento da Parcela #{numeroK} de {parcela?.quantidade_total ?? 0}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <RadioGroup value={modo} onValueChange={(valor) => setModo(valor as ModoCancelamento)}>
            <RadioGroupItem value="PONTUAL" disabled={cancelando} textoAcessivel="Cancelar apenas esta parcela">
              <span className="block text-sm font-medium text-foreground">
                Cancelar apenas a Parcela #{numeroK}
              </span>
              <span className="mt-0.5 block text-xs text-foreground-muted">
                As demais parcelas do plano permanecem no fluxo de cobranca.
              </span>
            </RadioGroupItem>
            <RadioGroupItem value="SUBSEQUENTES" disabled={cancelando} textoAcessivel="Cancelar o plano a partir desta parcela abortando futuras">
              <span className="block text-sm font-medium text-foreground">
                Cancelar o plano a partir da Parcela #{numeroK} (abortar futuras)
              </span>
              <span className="mt-0.5 block text-xs text-foreground-muted">
                As parcelas seguintes em aberto serao abortadas e saem do fluxo futuro.
              </span>
            </RadioGroupItem>
          </RadioGroup>

          {modo === "SUBSEQUENTES" ? (
            <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-foreground">
              {subsequentes.length > 0 ? (
                <p>
                  A Parcela <strong>#{numeroK}</strong> sera marcada como <strong>Cancelada</strong>. As Parcelas{" "}
                  <strong>
                    #{subsequentes[0].numero_parcela}..#{subsequentes[subsequentes.length - 1].numero_parcela}
                  </strong>{" "}
                  serao <strong>Abortadas</strong> (total de <strong>{formataMoeda(totalAbortado)}</strong> fora do
                  fluxo futuro).
                </p>
              ) : (
                <p>
                  A Parcela <strong>#{numeroK}</strong> sera marcada como <strong>Cancelada</strong>. Nao ha parcelas
                  futuras em aberto para abortar.
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
              placeholder="Ex.: cliente desistiu do consorcio nesta parcela."
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
