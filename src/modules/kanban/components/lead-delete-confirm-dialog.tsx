import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeadDeleteConfirmDialogProps = {
  aberto: boolean;
  nomeLead: string;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
};

export function LeadDeleteConfirmDialog({ aberto, nomeLead, onCancelar, onConfirmar }: LeadDeleteConfirmDialogProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <Trash2 className="h-6 w-6 text-rose-600" />
          </div>
        </div>
        <h3 className="mb-2 text-center text-lg font-semibold text-slate-900">Excluir lead</h3>
        <p className="mb-6 text-center text-sm text-slate-600">
          Tem certeza que deseja excluir <strong>{nomeLead}</strong>? Esta acao nao pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => void onConfirmar()}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
