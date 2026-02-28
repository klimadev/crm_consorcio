"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
} from "@/lib/utils";
import type { Estagio, Funcionario, KanbanFilters, ResumoPendencias, OrdenacaoKanban } from "../types";
import { PendenciaBadge } from "./pendencia-badge";
import { cn } from "@/lib/utils";
import { Filter, X, Bell, BellOff, Search, ArrowUpDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type KanbanHeaderProps = {
  dialogNovoLeadAberto: boolean;
  setDialogNovoLeadAberto: (aberto: boolean) => void;
  criarLead: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  estagios: Estagio[];
  funcionarios: Funcionario[];
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  telefoneNovoLead: string;
  setTelefoneNovoLead: (telefone: string) => void;
  valorNovoLead: string;
  setValorNovoLead: (valor: string) => void;
  erroNovoLead: string | null;
  setErroNovoLead: (erro: string | null) => void;
  estagioAberto: string;
  estagioNovoLead: string;
  setEstagioNovoLead: (estagio: string) => void;
  cargoNovoLead: { id_funcionario: string } | null;
  setCargoNovoLead: (cargo: { id_funcionario: string } | null) => void;
  filtros: KanbanFilters;
  setFiltros: (filtros: KanbanFilters) => void;
  busca: string;
  setBusca: (busca: string) => void;
  ordenacao: OrdenacaoKanban;
  setOrdenacao: (ordenacao: OrdenacaoKanban) => void;
  modoFocoPendencias: boolean;
  setModoFocoPendencias: (ativo: boolean) => void;
  resumoPendencias: ResumoPendencias | null;
  notificacoesAtivadas: boolean;
  alternarNotificacoes: () => Promise<boolean>;
  permissaoNotificacao: () => NotificationPermission | "unknown";
};

export function KanbanHeader({
  dialogNovoLeadAberto,
  setDialogNovoLeadAberto,
  criarLead,
  estagios,
  funcionarios,
  perfil,
  telefoneNovoLead,
  setTelefoneNovoLead,
  valorNovoLead,
  setValorNovoLead,
  erroNovoLead,
  setErroNovoLead,
  estagioAberto,
  estagioNovoLead,
  setEstagioNovoLead,
  cargoNovoLead,
  setCargoNovoLead,
  filtros,
  setFiltros,
  busca,
  setBusca,
  ordenacao,
  setOrdenacao,
  modoFocoPendencias,
  setModoFocoPendencias,
  resumoPendencias,
  notificacoesAtivadas,
  alternarNotificacoes,
  permissaoNotificacao,
}: KanbanHeaderProps) {
  const { addToast } = useToast();
  const filtrosAtivos = filtros.status !== "todos" || filtros.gravidade !== "todas" || filtros.tipo !== "todos";
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputBuscaRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputBuscaRef.current) {
        setBusca("");
        inputBuscaRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const limparFiltros = () => {
    setFiltros({ status: "todos", gravidade: "todas", tipo: "todos" });
  };

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0.0,0,04)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Kanban</h1>
          <p className="text-sm text-slate-500">Funil de vendas com arrastar e soltar.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputBuscaRef}
            type="text"
            placeholder="Buscar lead... (Ctrl+K)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 w-48 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200/50"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 hover:bg-slate-300"
            >
              <X className="h-3 w-3 text-slate-500" />
            </button>
          )}
        </div>

        <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoKanban)}>
          <SelectTrigger className="h-9 w-36 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recente">Mais recente</SelectItem>
            <SelectItem value="antigo">Mais antigo</SelectItem>
            <SelectItem value="valor_maior">Maior valor</SelectItem>
            <SelectItem value="valor_menor">Menor valor</SelectItem>
            <SelectItem value="nome">Nome A-Z</SelectItem>
          </SelectContent>
        </Select>

        {resumoPendencias && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <PendenciaBadge resumo={resumoPendencias} tamanho="md" modoExpansivo />
          </div>
        )}

        <Button
          variant={modoFocoPendencias ? "default" : "outline"}
          size="sm"
          onClick={() => setModoFocoPendencias(!modoFocoPendencias)}
          className={cn(
            "rounded-xl text-sm font-medium",
            modoFocoPendencias ? "bg-red-500 hover:bg-red-600" : "border-slate-200"
          )}
        >
          <Filter className="mr-2 h-4 w-4" />
          Foco Pendências
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const permissao = permissaoNotificacao();
if (permissao === "denied") {
              addToast({ type: "warning", title: "Notificações bloqueadas", description: "Habilite nas configurações do navegador." });
              return;
            }
            await alternarNotificacoes();
          }}
          className={cn(
            "rounded-xl text-sm font-medium",
            notificacoesAtivadas
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-slate-200"
          )}
          title={
            notificacoesAtivadas
              ? "Notificações ativadas - clique para desativar"
              : "Ativar notificações de novas pendências"
          }
        >
          {notificacoesAtivadas ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Select
            value={filtros.status}
            onValueChange={(v) => setFiltros({ ...filtros, status: v as KanbanFilters["status"] })}
          >
            <SelectTrigger className="h-8 w-32 border-0 bg-transparent text-sm font-medium text-slate-600 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com_pendencia">Com pendência</SelectItem>
              <SelectItem value="sem_pendencia">Sem pendência</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-slate-200" />

          <Select
            value={filtros.gravidade}
            onValueChange={(v) => setFiltros({ ...filtros, gravidade: v as KanbanFilters["gravidade"] })}
          >
            <SelectTrigger className="h-8 w-24 border-0 bg-transparent text-sm font-medium text-slate-600 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Gravidade</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alerta">Alerta</SelectItem>
            </SelectContent>
          </Select>

          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Dialog
          open={dialogNovoLeadAberto}
          onOpenChange={(aberto) => {
            setDialogNovoLeadAberto(aberto);
            if (!aberto) {
              setErroNovoLead(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto">
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar lead</DialogTitle>
            </DialogHeader>

            <form className="space-y-3" onSubmit={criarLead}>
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                name="nome"
                placeholder="Nome"
                required
              />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                name="telefone"
                placeholder="Telefone"
                value={telefoneNovoLead}
                onChange={(e) => setTelefoneNovoLead(aplicaMascaraTelefoneBr(e.target.value))}
                required
              />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                name="valor_consorcio"
                placeholder="Valor"
                inputMode="numeric"
                value={valorNovoLead}
                onChange={(e) => setValorNovoLead(aplicaMascaraMoedaBr(e.target.value))}
                required
              />

              <input type="hidden" name="id_estagio" value={estagioNovoLead || estagioAberto} />

              <Select value={estagioNovoLead || estagioAberto} onValueChange={setEstagioNovoLead}>
                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                  <SelectValue placeholder="Estagio" />
                </SelectTrigger>
                <SelectContent>
                  {estagios.map((estagio) => (
                    <SelectItem key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {perfil !== "COLABORADOR" ? (
                <Select
                  onValueChange={(valor) => setCargoNovoLead({ id_funcionario: valor })}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
                    <SelectValue placeholder="Funcionario" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              {erroNovoLead ? <p className="text-sm font-medium text-red-600">{erroNovoLead}</p> : null}

              <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" type="submit">
                Criar lead
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
