"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Search,
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
      return <ArrowUpDown className="h-4 w-4 text-foreground-disabled" />;
    }
    return vm.direcao === "asc" 
      ? <ArrowUp className="h-4 w-4 text-foreground font-semibold" /> 
      : <ArrowDown className="h-4 w-4 text-foreground font-semibold" />;
  }

  const todosDaPaginaSelecionados = vm.funcionarios.length > 0 && vm.funcionarios.every((item) => vm.idsSelecionados.includes(item.id));

  const temFiltrosAtivos = vm.busca || vm.idPdvFiltro || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";

  if (vm.funcionarios.length === 0 && !vm.carregandoLista) {
    const ehSemResultados = temFiltrosAtivos;
    
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background-surface py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          {ehSemResultados ? (
            <Search className="h-8 w-8 text-foreground-disabled" />
          ) : (
            <Users className="h-8 w-8 text-foreground-disabled" />
          )}
        </div>
        {ehSemResultados ? (
          <>
            <p className="text-lg font-semibold text-foreground">Nenhum resultado encontrado</p>
            <p className="mt-1 max-w-xs text-sm text-foreground-muted">Tente ajustar os filtros ou buscar por outros termos.</p>
            <Button 
              variant="outline"
              className="mt-6 rounded-xl border-border font-medium text-foreground-muted hover:bg-background-surface" 
              onClick={vm.limparFiltros}
            >
              Limpar filtros
            </Button>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-foreground">Nenhum colaborador cadastrado</p>
            <p className="mt-1 max-w-xs text-sm text-foreground-muted">Adicione seu primeiro colaborador para comecar a gerenciar sua equipe.</p>
            {vm.podeGerenciarEmpresa && (
              <Button className="mt-6 rounded-xl bg-foreground font-medium text-background hover:bg-foreground/90" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
                Adicionar colaborador
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hidden rounded-2xl border border-border bg-background-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/80">
            {vm.podeExecutarAcoesLote && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={todosDaPaginaSelecionados}
                  onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring"
                  aria-label="Selecionar todos os colaboradores desta pagina"
                />
              </TableHead>
            )}
            <TableHead aria-sort={campoOrdenacao === "nome" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("nome")}
              >
                Nome {iconeOrdenacao("nome")}
              </button>
            </TableHead>
            <TableHead aria-sort={campoOrdenacao === "email" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("email")}
              >
                Email {iconeOrdenacao("email")}
              </button>
            </TableHead>
            <TableHead aria-sort={campoOrdenacao === "cargo" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("cargo")}
              >
                Cargo {iconeOrdenacao("cargo")}
              </button>
            </TableHead>
            <TableHead aria-sort={campoOrdenacao === "pdv" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("pdv")}
              >
                PDV {iconeOrdenacao("pdv")}
              </button>
            </TableHead>
            <TableHead aria-sort={campoOrdenacao === "status" ? (vm.direcao === "asc" ? "ascending" : "descending") : "none"}>
              <button 
                type="button" 
                className="flex items-center gap-1 font-medium" 
                onClick={() => alternarOrdenacao("status")}
              >
                Status {iconeOrdenacao("status")}
              </button>
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.funcionarios.map((funcionario) => (
            <TableRow 
              key={funcionario.id} 
              className="cursor-pointer border-border/60 transition-all duration-200 hover:bg-muted/80 hover:shadow-sm"
              onClick={() => vm.iniciarEdicao(funcionario)}
            >
              {vm.podeExecutarAcoesLote && (
                <TableCell className="py-5">
                  <input
                    type="checkbox"
                    checked={vm.idsSelecionados.includes(funcionario.id)}
                    onChange={(e) => vm.alternarSelecao(funcionario.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring"
                    aria-label={`Selecionar ${funcionario.nome}`}
                  />
                </TableCell>
              )}
              <TableCell className="py-5">
                <button
                  type="button"
                  className="-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 transition-all duration-200 hover:bg-background-surface hover:shadow-sm"
                  onClick={() => vm.iniciarEdicao(funcionario)}
                  title="Clique para editar"
                >
                  <Avatar nome={funcionario.nome} tamanho="md" />
                  <div className="flex flex-col items-start">
                    <p className="text-sm font-medium text-foreground">{funcionario.nome}</p>
                    <span className="flex items-center gap-1 text-xs text-info opacity-0 transition-opacity hover:opacity-100">
                      <Pencil className="h-3 w-3" />
                      Editar
                    </span>
                  </div>
                </button>
              </TableCell>
              <TableCell className="py-5">
                <p className="text-sm text-foreground-muted">{funcionario.email}</p>
              </TableCell>
              <TableCell className="py-5">
                <span className="text-sm text-foreground-muted">{funcionario.cargo}</span>
              </TableCell>
              <TableCell className="py-5 text-foreground-muted">
                <span className="text-sm">{funcionario.pdv?.nome}</span>
              </TableCell>
              <TableCell className="py-5">
                <StatusBadge ativo={funcionario.ativo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
