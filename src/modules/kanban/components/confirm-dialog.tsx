import { useRef } from "react";
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

  if (!aberto) return null;

  const destrutivo = modo === "destrutivo";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl">
        {icone ? (
          <div className="mb-4 flex items-center justify-center">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                destrutivo ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-700",
              )}
            >
              {icone}
            </div>
          </div>
        ) : null}

        <h3 className="mb-2 text-center text-lg font-semibold text-slate-900">{titulo}</h3>
        <div className="mb-6 text-center text-sm text-slate-600">{descricao}</div>

        {erro ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
            onClick={() => void onConfirmar()}
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
