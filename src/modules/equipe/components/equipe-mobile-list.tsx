"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./shared/status-badge";
import { Avatar } from "./shared/avatar";
import type { UseEquipeModuleReturn } from "../types";

type EquipeMobileListProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeMobileList({ vm }: EquipeMobileListProps) {
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

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
          type="checkbox"
          checked={todosDaPaginaSelecionados}
          onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
        />
        <span className="text-sm text-slate-500">Selecionar todos</span>
      </div>
      
      {vm.funcionarios.map((funcionario) => {
        const estaEditando = vm.editandoId === funcionario.id && !!vm.dadosEdicao;
        const isSelected = vm.idsSelecionados.includes(funcionario.id);

        return (
          <div
            key={funcionario.id}
            className={`relative rounded-xl border bg-white p-4 shadow-sm transition-all ${
              isSelected ? "border-blue-300 bg-blue-50/30" : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => vm.alternarSelecao(funcionario.id, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
              />
              
              <Avatar nome={funcionario.nome} tamanho="md" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 truncate">{funcionario.nome}</p>
                  <StatusBadge ativo={funcionario.ativo} />
                </div>
                <p className="text-sm text-slate-500 truncate">{funcionario.email}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span className="font-medium">{funcionario.cargo}</span>
                  <span>{funcionario.pdv?.nome || "Sem PDV"}</span>
                </div>
              </div>

              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setMenuAberto(menuAberto === funcionario.id ? null : funcionario.id)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {menuAberto === funcionario.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
                  <div className="absolute right-4 top-12 z-20 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button 
                      type="button" 
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => { vm.iniciarEdicao(funcionario); setMenuAberto(null); }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    {vm.podeGerenciarEmpresa && (
                      <button 
                        type="button" 
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        onClick={() => { vm.abrirModalInativacao(funcionario); setMenuAberto(null); }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Deletar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {estaEditando && vm.dadosEdicao && (
              <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
                <Input
                  className="h-9 rounded-lg border-slate-200 bg-white text-sm"
                  placeholder="Nome"
                  value={vm.dadosEdicao.nome}
                  onChange={(e) => vm.aoMudarDado("nome", e.target.value)}
                />
                <Input
                  className="h-9 rounded-lg border-slate-200 bg-white text-sm"
                  placeholder="Email"
                  value={vm.dadosEdicao.email}
                  onChange={(e) => vm.aoMudarDado("email", e.target.value)}
                />
                <Select
                  value={vm.dadosEdicao.cargo}
                  onValueChange={(valor) => vm.aoMudarDado("cargo", valor)}
                >
                  <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm">
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                    <SelectItem value="GERENTE">GERENTE</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 h-8 rounded-lg border-slate-200 bg-white text-xs"
                    onClick={vm.cancelarEdicao}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
