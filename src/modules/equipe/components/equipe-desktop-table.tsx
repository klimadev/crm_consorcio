"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
        setMenuPosicao({
          top: rect.bottom + 6,
          left: rect.right - 160,
        });
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

    function atualizarPosicao() {
      const rect = botaoRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setMenuPosicao({
        top: rect.bottom + 6,
        left: rect.right - 160,
      });
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEsc);
    window.addEventListener("scroll", atualizarPosicao, true);
    window.addEventListener("resize", atualizarPosicao);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEsc);
      window.removeEventListener("scroll", atualizarPosicao, true);
      window.removeEventListener("resize", atualizarPosicao);
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
  const campoOrdenacao = vm.ordenarPor as "nome" | "email" | "cargo";

  function alternarOrdenacao(campo: "nome" | "email" | "cargo") {
    const proximaDirecao = campoOrdenacao === campo && vm.direcao === "asc" ? "desc" : "asc";
    vm.atualizarParametrosUrl({ ordenar_por: campo, direcao: proximaDirecao }, true);
  }

  function iconeOrdenacao(campo: "nome" | "email" | "cargo") {
    if (campoOrdenacao !== campo) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }
    return vm.direcao === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />;
  }

  const todosDaPaginaSelecionados = vm.funcionarios.length > 0 && vm.funcionarios.every((item) => vm.idsSelecionados.includes(item.id));

  if (vm.funcionarios.length === 0 && !vm.carregandoLista) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Users className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-700">Nenhum colaborador encontrado</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">Adicione seu primeiro colaborador para comecar a gerenciar sua equipe.</p>
        {vm.podeGerenciarEmpresa && (
          <Button className="mt-6 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => vm.setDialogNovoFuncionarioAberto(true)}>
            Adicionar colaborador
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={todosDaPaginaSelecionados}
                onChange={(e) => vm.alternarSelecaoPagina(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
              />
            </TableHead>
            <TableHead>
              <button type="button" className="flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("nome")}>
                Nome {iconeOrdenacao("nome")}
              </button>
            </TableHead>
            <TableHead>
              <button type="button" className="flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("email")}>
                Email {iconeOrdenacao("email")}
              </button>
            </TableHead>
            <TableHead>
              <button type="button" className="flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("cargo")}>
                Cargo {iconeOrdenacao("cargo")}
              </button>
            </TableHead>
            <TableHead>PDV</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.funcionarios.map((funcionario) => {
            const estaEditando = vm.editandoId === funcionario.id && !!vm.dadosEdicao;
            const statusLinha = vm.statusSalvamento.id === funcionario.id ? vm.statusSalvamento : null;
            const podeDesfazer = vm.ultimoSnapshot?.id === funcionario.id;

            return (
              <TableRow key={funcionario.id} className="border-slate-100">
                <TableCell className="py-5">
                  <input
                    type="checkbox"
                    checked={vm.idsSelecionados.includes(funcionario.id)}
                    onChange={(e) => vm.alternarSelecao(funcionario.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                  />
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-3">
                    <Avatar nome={funcionario.nome} tamanho="md" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{funcionario.nome}</p>
                      {estaEditando && vm.dadosEdicao && (
                        <Input
                          className="mt-1 h-8 rounded-lg border-slate-200 bg-slate-50 text-xs"
                          value={vm.dadosEdicao.nome}
                          onChange={(e) => vm.aoMudarDado("nome", e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  <p className="text-sm text-slate-600">{funcionario.email}</p>
                  {estaEditando && vm.dadosEdicao && (
                    <Input
                      className="mt-1 h-8 rounded-lg border-slate-200 bg-slate-50 text-xs"
                      value={vm.dadosEdicao.email}
                      onChange={(e) => vm.aoMudarDado("email", e.target.value)}
                    />
                  )}
                </TableCell>
                <TableCell className="py-5">
                  {estaEditando && vm.dadosEdicao ? (
                    <Select value={vm.dadosEdicao.cargo} onValueChange={(valor) => vm.aoMudarDado("cargo", valor)}>
                      <SelectTrigger className="h-9 w-32 rounded-lg border-slate-200 bg-slate-50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                        <SelectItem value="GERENTE">Gerente</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-slate-600">{funcionario.cargo}</span>
                  )}
                </TableCell>
                <TableCell className="py-5">
                  {estaEditando && vm.dadosEdicao ? (
                    <Select value={vm.dadosEdicao.id_pdv} onValueChange={(valor) => vm.aoMudarDado("id_pdv", valor)}>
                      <SelectTrigger className="h-9 w-32 rounded-lg border-slate-200 bg-slate-50 text-sm">
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
