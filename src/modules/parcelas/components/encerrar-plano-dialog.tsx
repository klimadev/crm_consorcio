"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Flag, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formataData, formataMoeda } from "@/lib/utils";
import { calcularEncerramentoPlano, obterParcelasEmAberto } from "@/lib/financeiro/parcelas";
import { ROTULOS_STATUS } from "@/lib/financeiro/vocabulario";
import type { Parcela } from "@/lib/api/parcelas";

// Motivos comuns viram chips de um clique: registrar o porquê precisa custar
// menos do que lembrar dele.
const MOTIVOS_COMUNS = [
  "Cliente desistiu do consórcio",
  "Sem condições de pagar no momento",
  "Fechou com outra administradora",
  "Renegociação direta com a administradora",
] as const;

type EncerrarPlanoDialogProps = {
  aberto: boolean;
  parcelas: Parcela[];
  encerrando: boolean;
  erro: string | null;
  onOpenChange: (aberto: boolean) => void;
  onEncerrar: (idParcelaParada: string, motivo?: string) => Promise<boolean>;
  /** Opcional: telas que não oferecem exclusão técnica (ex.: carteira) omitem o link de rodapé. */
  onExcluirRegistro?: () => void;
};

export function EncerrarPlanoDialog({
  aberto,
  parcelas,
  encerrando,
  erro,
  onOpenChange,
  onEncerrar,
  onExcluirRegistro,
}: EncerrarPlanoDialogProps) {
  const emAberto = useMemo(() => obterParcelasEmAberto(parcelas), [parcelas]);
  const [idParada, setIdParada] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (aberto) {
      setIdParada(emAberto[0]?.id ?? "");
      setMotivo("");
    }
  }, [aberto, emAberto]);

  const { parada, foraDaCobranca, totalForaDaCobranca } = useMemo(
    () => calcularEncerramentoPlano(parcelas, idParada),
    [parcelas, idParada],
  );
  const pagas = parcelas.filter((parcela) => parcela.status === "PAGA");
  const totalRecebido = pagas.reduce((total, parcela) => total + parcela.valor, 0);
  const ultima = foraDaCobranca[foraDaCobranca.length - 1];

  const confirmar = async () => {
    if (!parada || encerrando) return;
    const sucesso = await onEncerrar(parada.id, motivo.trim() ? motivo.trim() : undefined);
    if (sucesso) onOpenChange(false);
  };

  if (emAberto.length === 0) return null;

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Flag className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">Encerrar plano de pagamento</DialogTitle>
          <DialogDescription className="text-center">
            Registre onde o plano parou e por quê. Nada é apagado: o histórico continua contando a história.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pagas.length > 0 ? (
            <div className="rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-sm text-foreground">
              {pagas.length} {pagas.length === 1 ? "parcela paga" : "parcelas pagas"} ·{" "}
              <strong>{formataMoeda(totalRecebido)}</strong> permanecem como histórico.
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="encerrar-parcela-parada" className="text-sm font-medium text-foreground">
              Onde o plano parou?
            </label>
            <Select value={idParada} onValueChange={setIdParada} disabled={encerrando}>
              <SelectTrigger id="encerrar-parcela-parada" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emAberto.map((parcela) => (
                  <SelectItem key={parcela.id} value={parcela.id}>
                    #{parcela.numero_parcela} · {formataData(parcela.data_vencimento)} · {formataMoeda(parcela.valor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parada ? (
            <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-foreground">
              <p>
                A parcela <strong>#{parada.numero_parcela}</strong> será{" "}
                <strong>{ROTULOS_STATUS.CANCELADA.rotulo.toLowerCase()}</strong>
                {foraDaCobranca.length > 1 && ultima ? (
                  <>
                    , junto com as parcelas{" "}
                    <strong>
                      #{parada.numero_parcela + 1} a #{ultima.numero_parcela}
                    </strong>
                  </>
                ) : null}
                . Total de <strong>{formataMoeda(totalForaDaCobranca)}</strong> sai da cobrança futura.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="encerrar-motivo" className="text-sm font-medium text-foreground">
              Por que pararam? <span className="font-normal text-foreground-muted">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS_COMUNS.map((motivoComum) => (
                <button
                  key={motivoComum}
                  type="button"
                  onClick={() => setMotivo(motivoComum)}
                  disabled={encerrando}
                  className={cn(
                    "min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    motivo === motivoComum
                      ? "border-warning/40 bg-warning/15 text-warning"
                      : "border-border text-foreground-muted hover:bg-muted hover:text-foreground",
                  )}
                >
                  {motivoComum}
                </button>
              ))}
            </div>
            <Textarea
              id="encerrar-motivo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              maxLength={500}
              placeholder="Ex.: cliente pediu para retomar em janeiro."
              disabled={encerrando}
              className="min-h-16 text-sm"
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
            disabled={encerrando}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirmar()}
            disabled={encerrando || !parada}
            className="min-h-[44px]"
          >
            {encerrando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encerrando...
              </>
            ) : (
              "Encerrar plano"
            )}
          </Button>
        </DialogFooter>

        {onExcluirRegistro ? (
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onExcluirRegistro();
            }}
            className="mx-auto block text-center text-xs text-foreground-disabled underline underline-offset-2 transition-colors hover:text-destructive"
          >
            Plano cadastrado errado? Excluir registro (apaga tudo, inclusive pagas)
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
