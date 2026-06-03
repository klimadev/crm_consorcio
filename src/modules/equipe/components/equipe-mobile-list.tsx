"use client";

import { Loader2, LogIn, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./shared/status-badge";
import { Avatar } from "./shared/avatar";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type EquipeMobileListProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeMobileList({ vm }: EquipeMobileListProps) {
  const todosDaPaginaSelecionados =
    vm.funcionarios.length > 0 && vm.funcionarios.every((item) => vm.idsSelecionados.includes(item.id));

  if (vm.funcionarios.length === 0 && !vm.carregandoLista) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background-surface py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:hidden">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Users className="h-8 w-8 text-foreground-disabled" />
        </div>
        <p className="text-lg font-semibold text-foreground">Nenhum colaborador encontrado</p>
        <p className="mt-1 max-w-xs text-sm text-foreground-muted">Adicione seu primeiro colaborador para gerenciar sua equipe.</p>
        {vm.podeGerenciarEmpresa && (
          <Button className="mt-6 rounded-xl bg-foreground font-medium text-background hover:bg-foreground/90" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
            Adicionar colaborador
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      <div className="flex items-center gap-2 px-2">
        <input
          id="selecionar-todos-mobile"
          type="checkbox"
          checked={todosDaPaginaSelecionados}
          onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
          className="h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring"
        />
        <label htmlFor="selecionar-todos-mobile" className="text-sm text-foreground-muted">
          Selecionar todos
        </label>
      </div>

      {vm.funcionarios.map((funcionario) => {
        const isSelected = vm.idsSelecionados.includes(funcionario.id);

        return (
          <button
            type="button"
            key={funcionario.id}
            className={cn(
              "relative w-full cursor-pointer rounded-xl border bg-background-surface p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              isSelected ? "border-info/30 bg-info/5" : "border-border",
            )}
            onClick={() => vm.iniciarEdicao(funcionario)}
            aria-label={`Editar colaborador ${funcionario.nome}`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  vm.alternarSelecao(funcionario.id, e.target.checked);
                }}
                className="mt-1 h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring"
                onClick={(e) => e.stopPropagation()}
              />

              <Avatar nome={funcionario.nome} tamanho="md" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium text-foreground">{funcionario.nome}</p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge ativo={funcionario.ativo} />
                    {vm.podeGerenciarEmpresa && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          vm.loginComo(funcionario.id);
                        }}
                        disabled={vm.loginComoLoading === funcionario.id}
                        title="Login como"
                        aria-label={`Login como ${funcionario.nome}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-foreground-disabled transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {vm.loginComoLoading === funcionario.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="truncate text-sm text-foreground-muted">{funcionario.email}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-foreground-muted">
                  <span className="font-medium">{funcionario.cargo}</span>
                  <span>{funcionario.pdv?.nome || "Sem PDV"}</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-info">
                  <Pencil className="h-3 w-3" />
                  <span>Toque para editar</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
