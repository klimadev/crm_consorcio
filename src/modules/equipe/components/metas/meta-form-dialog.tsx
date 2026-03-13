import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetaCreationWizard } from "./meta-creation-wizard";
import type { UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetaFormDialogProps = {
  vm: UseMetasModuleReturn;
};

export function MetaFormDialog({ vm }: MetaFormDialogProps) {
  return (
    <Dialog open={vm.dialogFormAberto} onOpenChange={(aberto) => (aberto ? undefined : vm.fecharDialog())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vm.metaEmEdicao ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            {vm.metaEmEdicao
              ? "Atualize os dados da meta selecionada."
              : "Siga os passos para criar uma nova meta para sua equipe."}
          </DialogDescription>
        </DialogHeader>

        <MetaCreationWizard vm={vm} />
      </DialogContent>
    </Dialog>
  );
}
