"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseEquipeModuleReturn } from "../../types";

type NovoFuncionarioDialogProps = {
  vm: UseEquipeModuleReturn;
};

export function NovoFuncionarioDialog({ vm }: NovoFuncionarioDialogProps) {
  return (
    <Dialog
      open={vm.dialogNovoFuncionarioAberto}
      onOpenChange={(aberto) => {
        vm.setDialogNovoFuncionarioAberto(aberto);
        if (!aberto) {
          vm.setErroLista(null);
        }
      }}
    >
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={vm.adicionarFuncionario}>
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            name="nome"
            placeholder="Nome completo"
            required
          />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            name="email"
            type="email"
            placeholder="E-mail"
            required
          />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            name="senha"
            type="password"
            placeholder="Senha temporaria"
            required
          />

          <Select
            name="cargo"
            value={vm.cargoSelecionado}
            onValueChange={vm.setCargoSelecionado}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COLABORADOR">Colaborador</SelectItem>
              <SelectItem value="GERENTE">Gerente</SelectItem>
            </SelectContent>
          </Select>

          <Select
            name="id_pdv"
            value={vm.pdvSelecionado}
            onValueChange={vm.setPdvSelecionado}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
              <SelectValue placeholder="PDV" />
            </SelectTrigger>
            <SelectContent>
              {vm.pdvs.map((pdv) => (
                <SelectItem key={pdv.id} value={pdv.id}>
                  {pdv.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {vm.erroCadastro ? <p className="text-sm font-medium text-rose-600">{vm.erroCadastro}</p> : null}

          <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">
            Cadastrar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
