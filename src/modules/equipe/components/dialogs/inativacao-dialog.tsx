"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UseEquipeModuleReturn } from "../../types";

type InativacaoDialogProps = {
  vm: UseEquipeModuleReturn;
};

export function InativacaoDialog({ vm }: InativacaoDialogProps) {
  return (
    <Dialog
      open={vm.dialogInativacaoAberto}
      onOpenChange={(aberto) => {
        vm.setDialogInativacaoAberto(aberto);
        if (!aberto) {
          vm.setErroLista(null);
        }
      }}
    >
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Deletar colaborador</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja deletar <span className="font-semibold">{vm.funcionariosDestinoInativacao?.nome}</span>?
          </p>

          {vm.erroLista && <p className="text-sm font-medium text-rose-600">{vm.erroLista}</p>}

          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50"
              variant="outline"
              onClick={() => vm.setDialogInativacaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700"
              onClick={() => void vm.confirmarInativacaoIndividual()}
              disabled={vm.executandoInativacaoIndividual || !vm.destinoInativacaoIndividual}
            >
              {vm.executandoInativacaoIndividual ? "Processando..." : "Deletar colaborador"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
