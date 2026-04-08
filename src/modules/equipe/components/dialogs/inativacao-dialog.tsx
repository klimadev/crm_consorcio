"use client";

import { AlertCircle, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inativar colaborador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Ação sensível</p>
                  <p>
                    Ao inativar <span className="font-semibold">{vm.funcionariosDestinoInativacao?.nome}</span>, os leads atuais precisam ser
                    transferidos para outro colaborador ativo do mesmo PDV.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino da reatribuicao</p>
              <Select
                value={vm.destinoInativacaoIndividual}
                onValueChange={vm.setDestinoInativacaoIndividual}
                disabled={vm.executandoInativacaoIndividual || vm.funcionariosDestinoMesmoPdv.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {vm.funcionariosDestinoMesmoPdv.map((funcionario) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{funcionario.nome}</span>
                        <span className="text-xs text-slate-500">
                          {funcionario.cargo} • {funcionario.pdv?.nome}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {vm.destinoInativacaoIndividual ? (
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
                <div className="flex items-center gap-2 text-foreground-muted">
                  <ArrowRight className="h-4 w-4" />
                  <span>
                    Leads de <span className="font-semibold text-foreground">{vm.funcionariosDestinoInativacao?.nome}</span> serão enviados para o colaborador selecionado.
                  </span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacao (opcional)</p>
              <Textarea
                value={vm.observacaoInativacaoIndividual}
                onChange={(evento) => vm.setObservacaoInativacaoIndividual(evento.target.value)}
                placeholder="Ex.: Reatribuicao por mudanca de carteira"
                className="min-h-20"
              />
            </div>

            {vm.erroInativacaoIndividual ? (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{vm.erroInativacaoIndividual}</p>
              </div>
            ) : null}
            {vm.funcionariosDestinoMesmoPdv.length === 0 ? (
              <p className="text-sm font-medium text-amber-700">Nenhum colaborador ativo no mesmo PDV pode receber os leads agora.</p>
            ) : null}

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
              disabled={
                vm.executandoInativacaoIndividual ||
                !vm.destinoInativacaoIndividual ||
                vm.funcionariosDestinoMesmoPdv.length === 0
              }
            >
              {vm.executandoInativacaoIndividual ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inativando...
                </>
              ) : (
                "Confirmar inativação"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
