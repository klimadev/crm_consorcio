"use client";

import { Loader2, LogIn, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./shared/status-badge";
import { Avatar } from "./shared/avatar";
import type { UseEquipeModuleReturn } from "../types";

type EquipeMobileListProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeMobileList({ vm }: EquipeMobileListProps) {

  const todosDaPaginaSelecionados = vm.funcionarios.length > 0 && vm.funcionarios.every((item) => vm.idsSelecionados.includes(item.id));

  if (vm.funcionarios.length === 0 && !vm.carregandoLista) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:hidden">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Users className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-700">Nenhum colaborador encontrado</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">Adicione seu primeiro colaborador para gerenciar sua equipe.</p>
        {vm.podeGerenciarEmpresa && (
          <Button className="mt-6 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
            Adicionar colaborador
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-2">
      <div className="flex items-center gap-2 px-2">
        <input
          id="selecionar-todos-mobile"
          type="checkbox"
          checked={todosDaPaginaSelecionados}
          onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
        />
        <label htmlFor="selecionar-todos-mobile" className="text-sm text-slate-500">Selecionar todos</label>
      </div>
      
      {vm.funcionarios.map((funcionario) => {
        const isSelected = vm.idsSelecionados.includes(funcionario.id);

        return (
          <button
            type="button"
            key={funcionario.id}
            className={`relative cursor-pointer rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              isSelected ? "border-blue-300 bg-blue-50/30" : "border-slate-200"
            }`}
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
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
              
              <Avatar nome={funcionario.nome} tamanho="md" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 truncate">{funcionario.nome}</p>
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
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-sm text-slate-500 truncate">{funcionario.email}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="font-medium">{funcionario.cargo}</span>
                  <span>{funcionario.pdv?.nome || "Sem PDV"}</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
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
