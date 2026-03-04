"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "./shared/avatar";
import { StatusBadge } from "./shared/status-badge";
import type { UseEquipeModuleReturn } from "../types";

type EquipeDesktopTableProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeDesktopTable({ vm }: EquipeDesktopTableProps) {
  const campoOrdenacao = vm.ordenarPor as "nome" | "email" | "cargo" | "status" | "pdv";

  function alternarOrdenacao(campo: "nome" | "email" | "cargo" | "status" | "pdv") {
    const proximaDirecao = campoOrdenacao === campo && vm.direcao === "asc" ? "desc" : "asc";
    vm.atualizarParametrosUrl({ ordenar_por: campo, direcao: proximaDirecao }, true);
  }

  function iconeOrdenacao(campo: "nome" | "email" | "cargo" | "status" | "pdv") {
    if (campoOrdenacao !== campo) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
    }
    return vm.direcao === "asc" 
      ? <ArrowUp className="h-4 w-4 text-slate-800 font-semibold" /> 
      : <ArrowDown className="h-4 w-4 text-slate-800 font-semibold" />;
  }

  const todosDaPaginaSelecionados = vm.funcionarios.length > 0 && vm.funcionarios.every((item) => vm.idsSelecionados.includes(item.id));

  const temFiltrosAtivos = vm.busca || vm.idPdvFiltro || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";

  if (vm.funcionarios.length === 0 && !vm.carregandoLista) {
    const ehSemResultados = temFiltrosAtivos;
    
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          {ehSemResultados ? (
            <Search className="h-8 w-8 text-slate-400" />
          ) : (
            <Users className="h-8 w-8 text-slate-400" />
          )}
        </div>
        {ehSemResultados ? (
          <>
            <p className="text-lg font-semibold text-slate-700">Nenhum resultado encontrado</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">Tente ajustar os filtros ou buscar por outros termos.</p>
            <Button 
              variant="outline"
              className="mt-6 rounded-xl border-slate-300 font-medium text-slate-600 hover:bg-slate-50" 
              onClick={vm.limparFiltros}
            >
              Limpar filtros
            </Button>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-700">Nenhum colaborador cadastrado</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">Adicione seu primeiro colaborador para comecar a gerenciar sua equipe.</p>
            {vm.podeGerenciarEmpresa && (
              <Button className="mt-6 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
                Adicionar colaborador
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            {vm.podeExecutarAcoesLote && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={todosDaPaginaSelecionados}
                  onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                  aria-label="Selecionar todos os colaboradores desta pagina"
                />
              </TableHead>
            )}
            <TableHead>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("nome")}
                aria-sort={campoOrdenacao === "nome" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}
              >
                Nome {iconeOrdenacao("nome")}
              </button>
            </TableHead>
            <TableHead>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("email")}
                aria-sort={campoOrdenacao === "email" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}
              >
                Email {iconeOrdenacao("email")}
              </button>
            </TableHead>
            <TableHead>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("cargo")}
                aria-sort={campoOrdenacao === "cargo" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}
              >
                Cargo {iconeOrdenacao("cargo")}
              </button>
            </TableHead>
            <TableHead>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("pdv")}
                aria-sort={campoOrdenacao === "pdv" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}
              >
                PDV {iconeOrdenacao("pdv")}
              </button>
            </TableHead>
            <TableHead>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("status")}
                aria-sort={campoOrdenacao === "status" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}
              >
                Status {iconeOrdenacao("status")}
              </button>
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.funcionarios.map((funcionario) => (
            <TableRow key={funcionario.id} className="border-slate-100">
              {vm.podeExecutarAcoesLote && (
                <TableCell className="py-5">
                  <input
                    type="checkbox"
                    checked={vm.idsSelecionados.includes(funcionario.id)}
                    onChange={(e) => vm.alternarSelecao(funcionario.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                    aria-label={`Selecionar ${funcionario.nome}`}
                  />
                </TableCell>
              )}
              <TableCell className="py-5">
                <div className="flex items-center gap-3">
                  <Avatar nome={funcionario.nome} tamanho="md" />
                  <p className="text-sm font-medium text-slate-800">{funcionario.nome}</p>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <p className="text-sm text-slate-600">{funcionario.email}</p>
              </TableCell>
              <TableCell className="py-5">
                <span className="text-sm text-slate-600">{funcionario.cargo}</span>
              </TableCell>
              <TableCell className="py-5">
                <span className="text-sm text-slate-600">{funcionario.pdv?.nome}</span>
              </TableCell>
              <TableCell className="py-5">
                <StatusBadge ativo={funcionario.ativo} />
              </TableCell>
              <TableCell className="py-5">
                <div className="flex items-center justify-end gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => vm.iniciarEdicao(funcionario)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  {funcionario.ativo && vm.podeInativar && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => vm.abrirModalInativacao(funcionario)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Deletar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
