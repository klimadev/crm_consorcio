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
  const motivoId = "motivo-perda";

  return (
    <Dialog open={Boolean(movimentoPendente)} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Motivo de perda</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={onConfirmarPerda}>
          <div className="space-y-1.5">
            <label htmlFor={motivoId} className="block text-sm font-medium text-foreground">Motivo da perda</label>
          <Textarea
            id={motivoId}
            className="min-h-[100px] rounded-xl border-border bg-background-surface text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            placeholder="Descreva o motivo da perda..."
            required
          />
          </div>
          <Button className="w-full rounded-xl bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90" type="submit">
            Confirmar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
