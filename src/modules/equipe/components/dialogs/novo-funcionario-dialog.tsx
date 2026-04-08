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
  // GERENTE só pode adicionar COLABORADOR no próprio PDV
  const isGerente = vm.podeAdicionarFuncionario && !vm.podeGerenciarEmpresa;
  const cargosDisponiveis = isGerente
    ? [{ value: "COLABORADOR", label: "Colaborador" }]
    : [
        { value: "COLABORADOR", label: "Colaborador" },
        { value: "GERENTE", label: "Gerente" },
        { value: "ADMINISTRADOR", label: "Administrador" },
      ];
  const nomeId = "novo-funcionario-nome";
  const emailId = "novo-funcionario-email";
  const senhaId = "novo-funcionario-senha";
  const cargoId = "novo-funcionario-cargo";
  const pdvId = "novo-funcionario-pdv";
  const erroId = "novo-funcionario-erro";

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
          <div className="space-y-1">
            <label htmlFor={nomeId} className="block text-sm font-medium text-foreground">Nome completo</label>
            <Input
              id={nomeId}
              className="h-11 rounded-xl border-border bg-background-elevated text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
             name="nome"
            placeholder="Nome completo"
            required
              aria-describedby={vm.erroCadastro ? erroId : undefined}
              aria-invalid={vm.erroCadastro ? true : undefined}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={emailId} className="block text-sm font-medium text-foreground">E-mail</label>
            <Input
              id={emailId}
              className="h-11 rounded-xl border-border bg-background-elevated text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
             name="email"
            type="email"
            placeholder="E-mail"
            required
              aria-describedby={vm.erroCadastro ? erroId : undefined}
              aria-invalid={vm.erroCadastro ? true : undefined}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={senhaId} className="block text-sm font-medium text-foreground">Senha temporária</label>
            <Input
              id={senhaId}
              className="h-11 rounded-xl border-border bg-background-elevated text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
             name="senha"
            type="password"
            placeholder="Senha temporaria"
            required
              aria-describedby={vm.erroCadastro ? erroId : undefined}
              aria-invalid={vm.erroCadastro ? true : undefined}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={cargoId} className="block text-sm font-medium text-foreground">Cargo</label>
          <Select
            name="cargo"
            value={vm.cargoSelecionado}
            onValueChange={vm.setCargoSelecionado}
          >
            <SelectTrigger id={cargoId} className="h-11 w-full rounded-xl border-border bg-background-elevated text-sm font-medium text-foreground" aria-describedby={vm.erroCadastro ? erroId : undefined} aria-invalid={vm.erroCadastro ? true : undefined}>
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              {cargosDisponiveis.map((cargo) => (
                <SelectItem key={cargo.value} value={cargo.value}>
                  {cargo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          {isGerente ? (
            <input type="hidden" name="id_pdv" value={vm.pdvSelecionado} />
          ) : (
            <div className="space-y-1">
              <label htmlFor={pdvId} className="block text-sm font-medium text-foreground">PDV</label>
            <Select
              name="id_pdv"
              value={vm.pdvSelecionado}
              onValueChange={vm.setPdvSelecionado}
            >
              <SelectTrigger id={pdvId} className="h-11 w-full rounded-xl border-border bg-background-elevated text-sm font-medium text-foreground" aria-describedby={vm.erroCadastro ? erroId : undefined} aria-invalid={vm.erroCadastro ? true : undefined}>
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
            </div>
          )}

          {vm.erroCadastro ? <p id={erroId} role="alert" className="text-sm font-medium text-rose-600">{vm.erroCadastro}</p> : null}

          <Button className="w-full rounded-xl bg-primary font-medium text-primary-foreground hover:bg-primary/90" type="submit" disabled={vm.carregandoCadastro}>
            {vm.carregandoCadastro ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cadastrando...
              </span>
            ) : (
              "Cadastrar"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
