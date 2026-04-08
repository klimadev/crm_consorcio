import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetaCreationWizard } from "./meta-creation-wizard";
import type { UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetaFormDialogProps = {
  vm: UseMetasModuleReturn;
};

export function MetaFormDialog({ vm }: MetaFormDialogProps) {
  return (
    <Dialog open={vm.dialogFormAberto} onOpenChange={(aberto) => (aberto ? undefined : vm.fecharDialog())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
        <div className="overflow-hidden rounded-[32px] border border-border bg-background-surface shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)]">
          <DialogHeader className="border-b border-border bg-gradient-to-r from-success/10 via-background-surface to-background px-6 py-5 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {vm.metaEmEdicao ? "Ajustar meta da equipe" : "Criar meta semanal"}
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-6 text-foreground-muted">
              Preencha so o essencial: equipe, tipo da meta, valor da semana e periodo. O painel se atualiza sozinho e fica facil de acompanhar.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <MetaCreationWizard
              key={vm.metaEmEdicao?.id ?? `nova-${vm.pdvSelecionado ?? "todas"}`}
              vm={vm}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
