"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "./shared/avatar";
import { StatusBadge } from "./shared/status-badge";
import type { UseEquipeModuleReturn } from "../types";
import type { Funcionario } from "../types";

type LinhaAcoesProps = {
  editando: boolean;
  podeDesfazer: boolean;
  statusSalvamento: { estado: string; mensagem?: string } | null;
  onEditar: () => void;
  onCancelar: () => void;
  onDesfazer: () => void;
  onInativar?: () => void;
};

function LinhaAcoes({ editando, podeDesfazer, statusSalvamento, onEditar, onCancelar, onDesfazer, onInativar }: LinhaAcoesProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuPosicao, setMenuPosicao] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  function alternarMenu() {
    if (!menuAberto) {
      const rect = botaoRef.current?.getBoundingClientRect();
      if (rect) {
        // Calcula posiÃ§Ã£o inicial
        let top = rect.bottom + 6;
        let left = rect.right - 160;

        // Verifica overflow horizontal (direita)
        if (left < 10) {
          left = 10;
        } else if (left + 160 > window.innerWidth - 10) {
          left = window.innerWidth - 170;
        }

        // Verifica overflow vertical (baixo)
        const menuHeight = 100; // altura aproximada do menu
        if (top + menuHeight > window.innerHeight - 10) {
          top = rect.top - menuHeight - 6;
        }
        if (top < 10) {
          top = 10;
        }

        setMenuPosicao({ top, left });
      }
    }

    setMenuAberto((aberto) => !aberto);
  }

  useEffect(() => {
    if (!menuAberto) {
      return;
    }

    function aoClicarFora(evento: MouseEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) {
        setMenuAberto(false);
      }
    }

    function aoPressionarEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEsc);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEsc);
    };
  }, [menuAberto]);

  if (editando) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={onCancelar}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancelar
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900" disabled={!podeDesfazer || statusSalvamento?.estado === "saving"} onClick={onDesfazer}>
          <X className="mr-1 h-3.5 w-3.5" />
          Desfazer
        </Button>
      </div>
    );
  }

  return (
    <div ref={menuRef}>
      <Button ref={botaoRef} size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={alternarMenu}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {menuAberto && menuPosicao && (
        <div
          className="fixed z-50 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          style={{ top: `${menuPosicao.top}px`, left: `${menuPosicao.left}px` }}
        >
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => { onEditar(); setMenuAberto(false); }}>
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          {onInativar && (
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => { onInativar(); setMenuAberto(false); }}>
              <Trash2 className="h-4 w-4" />
              Deletar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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

  const temFiltrosAtivos = vm.busca || vm.statusFiltro !== "TODOS" || vm.cargoFiltro !== "TODOS";

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
            <TableHead className="text-right">AÃ§Ãµes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.funcionarios.map((funcionario) => {
            const estaEditando = vm.editandoId === funcionario.id && !!vm.dadosEdicao;
            const statusLinha = vm.statusSalvamento.id === funcionario.id ? vm.statusSalvamento : null;
            const podeDesfazer = vm.ultimoSnapshot?.id === funcionario.id;

            return (
              <TableRow key={funcionario.id} className={cn("border-slate-100", estaEditando && "bg-amber-50/50")}>
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
                    <div>
                      {estaEditando && vm.dadosEdicao ? (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                            {statusLinha?.estado === "saving" ? (
                              <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Salvando...
                              </>
                            ) : statusLinha?.estado === "saved" ? (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Salvo
                              </>
                            ) : statusLinha?.estado === "error" ? (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                </span>
                                Erro
                              </>
                            ) : (
                              <>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                Editando
                              </>
                            )}
                          </span>
                          <Input
                            className="h-8 rounded-lg border-amber-300 bg-white text-xs focus:ring-2 focus:ring-amber-200"
                            value={vm.dadosEdicao.nome}
                            onChange={(e) => vm.aoMudarDado("nome", e.target.value)}
                            aria-label="Nome"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-slate-800">{funcionario.nome}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  {estaEditando && vm.dadosEdicao ? (
                    <Input
                      className="h-8 rounded-lg border-amber-300 bg-white text-xs focus:ring-2 focus:ring-amber-200"
                      value={vm.dadosEdicao.email}
                      onChange={(e) => vm.aoMudarDado("email", e.target.value)}
                      aria-label="E-mail"
                    />
                  ) : (
                    <p className="text-sm text-slate-600">{funcionario.email}</p>
                  )}
                </TableCell>
                <TableCell className="py-5">
                  {estaEditando && vm.dadosEdicao ? (
                    <Select value={vm.dadosEdicao.cargo} onValueChange={(valor) => vm.aoMudarDado("cargo", valor)}>
                      <SelectTrigger className="h-9 w-32 rounded-lg border-amber-300 bg-white text-sm focus:ring-2 focus:ring-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                        <SelectItem value="GERENTE">Gerente</SelectItem>
                        <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-slate-600">{funcionario.cargo}</span>
                  )}
                </TableCell>
                <TableCell className="py-5">
                  {estaEditando && vm.dadosEdicao ? (
                    <Select value={vm.dadosEdicao.id_pdv} onValueChange={(valor) => vm.aoMudarDado("id_pdv", valor)}>
                      <SelectTrigger className="h-9 w-32 rounded-lg border-amber-300 bg-white text-sm focus:ring-2 focus:ring-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.pdvs.map((pdv) => (
                          <SelectItem key={pdv.id} value={pdv.id}>
                            {pdv.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-slate-600">{funcionario.pdv?.nome}</span>
                  )}
                </TableCell>
                <TableCell className="py-5">
                  <StatusBadge ativo={funcionario.ativo} />
                </TableCell>
                <TableCell className="py-5">
                  <LinhaAcoes
                    editando={estaEditando}
                    podeDesfazer={podeDesfazer}
                    statusSalvamento={statusLinha}
                    onEditar={() => vm.iniciarEdicao(funcionario)}
                    onCancelar={vm.cancelarEdicao}
                    onDesfazer={vm.desfazerUltimaEdicao}
                    onInativar={funcionario.ativo && vm.podeInativar ? () => vm.abrirModalInativacao(funcionario) : undefined}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
