"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          <DialogTitle>Inativar colaborador</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Selecione um colaborador de destino para reatribuir os leads de <span className="font-semibold">{vm.funcionariosDestinoInativacao?.nome}</span> antes de inativar.
          </p>

          <Select
            value={vm.destinoInativacaoIndividual}
            onValueChange={vm.setDestinoInativacaoIndividual}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Colaborador de destino" />
            </SelectTrigger>
            <SelectContent>
              {vm.funcionariosAtivosParaDestino
                .filter((f) => f.id !== vm.funcionariosDestinoInativacao?.id)
                .map((funcionario) => (
                  <SelectItem key={funcionario.id} value={funcionario.id}>
                    {funcionario.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            placeholder="Observacao (opcional)"
            value={vm.observacaoInativacaoIndividual}
            onChange={(e) => vm.setObservacaoInativacaoIndividual(e.target.value)}
          />

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
              {vm.executandoInativacaoIndividual ? "Processando..." : "Confirmar inativacao"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
