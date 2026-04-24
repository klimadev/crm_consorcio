import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";

type ConfirmDialogProps = {
  aberto: boolean;
  titulo: string;
  descricao: ReactNode;
  erro: string | null;
  confirmando: boolean;
  textoConfirmar: string;
  textoConfirmando?: string;
  textoCancel?: string;
  onCancelar: () => void;
  onConfirmar: () => void | Promise<void>;
  modo?: "padrao" | "destrutivo";
  icone?: ReactNode;
};

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  erro,
  confirmando,
  textoConfirmar,
  textoConfirmando,
  textoCancel = "Cancelar",
  onCancelar,
  onConfirmar,
  modo = "padrao",
  icone,
}: ConfirmDialogProps) {
  const botaoCancelarRef = useRef<HTMLButtonElement | null>(null);
  const tituloId = useId();
  const descricaoId = useId();

  useEffect(() => {
    if (!aberto) return;
    botaoCancelarRef.current?.focus();
  }, [aberto]);

  if (!aberto) return null;

  const destrutivo = modo === "destrutivo";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <div role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={descricaoId} className="w-full max-w-md animate-in zoom-in-95 rounded-2xl border border-border bg-background-surface p-6 shadow-2xl pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        {icone ? (
          <div className="mb-4 flex items-center justify-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                destrutivo ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground-muted",
              )}
            >
              {icone}
            </div>
          </div>
        ) : null}

        <h3 id={tituloId} className="mb-2 text-center text-lg font-semibold text-foreground">{titulo}</h3>
        <div id={descricaoId} className="mb-6 text-center text-sm text-foreground-muted">{descricao}</div>

        {erro ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button ref={botaoCancelarRef} variant="outline" className="flex-1 rounded-xl" onClick={onCancelar} disabled={confirmando}>
            {textoCancel}
          </Button>
          <ActionButton
            variant={destrutivo ? "destructive" : "default"}
            className="flex-1 rounded-xl"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await onConfirmar();
            }}
            loading={confirmando}
            loadingText={textoConfirmando ?? textoConfirmar}
          >
            {textoConfirmar}
          </ActionButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type { ConfirmDialogProps };
