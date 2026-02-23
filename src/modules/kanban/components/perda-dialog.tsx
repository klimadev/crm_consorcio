"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PerdaDialogProps = {
  movimentoPendente: { id_lead: string; id_estagio: string } | null;
  motivoPerda: string;
  setMotivoPerda: (motivo: string) => void;
  onConfirmarPerda: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenChange: (aberto: boolean) => void;
};

export function PerdaDialog({
  movimentoPendente,
  motivoPerda,
  setMotivoPerda,
  onConfirmarPerda,
  onOpenChange,
}: PerdaDialogProps) {
  return (
    <Dialog open={Boolean(movimentoPendente)} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Motivo de perda</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onConfirmarPerda}>
          <Textarea
            className="rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50 min-h-[100px]"
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            placeholder="Descreva o motivo da perda..."
            required
          />
          <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">
            Confirmar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
