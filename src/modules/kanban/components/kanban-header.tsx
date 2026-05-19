"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  formataMoeda,
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
} from "@/lib/utils";
import type {
  Estagio,
  Funcionario,
  KanbanFilters,
  ResumoOperacionalKanban,
  ResumoPendencias,
  OrdenacaoKanban,
  Pdv,
  OrigemStats,
} from "../types";
import { PendenciaBadge } from "./pendencia-badge";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Bell,
  BellOff,
  CalendarDays,
  ChevronDown,
  Filter,
  Gauge,
  KanbanSquare,
  Megaphone,
  MessageCircle,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Store,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ActionButton } from "./action-button";
import { FuncionarioSelectOptions, obterResumoFuncionario } from "./funcionario-select-options";

type KanbanHeaderProps = {
  dialogNovoLeadAberto: boolean;
  setDialogNovoLeadAberto: (aberto: boolean) => void;
  criarLead: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
  estagios: Estagio[];
  funcionarios: Funcionario[];
  pdvs: Pdv[];
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  telefoneNovoLead: string;
  setTelefoneNovoLead: (telefone: string) => void;
  valorNovoLead: string;
  setValorNovoLead: (valor: string) => void;
  erroNovoLead: string | null;
  setErroNovoLead: (erro: string | null) => void;
  criandoLead: boolean;
  cargoNovoLead: { id_funcionario: string } | null;
  estagioAberto: string;
  estagioNovoLead: string;
  setEstagioNovoLead: (estagio: string) => void;
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
  totalLeads?: number;
  pendenciasCriticas?: number;
  origemStats: OrigemStats;
  resumoOperacional: ResumoOperacionalKanban;
  ultimaSincronizacaoWhatsapp: Date | null;
  instanciasAtivasCount: number;
  notificacoesAtivadas: boolean;
  alternarNotificacoes: () => Promise<boolean>;
  permissaoNotificacao: () => NotificationPermission | "unknown";
  sincronizandoWhatsapp: boolean;
  sincronizarWhatsapp: (params?: string) => Promise<{
    ok: boolean;
    erro?: string;
    criados?: number;
    instanciasIgnoradas?: Array<{ id: string; nome: string; motivo: string }>;
  }>;
  redistribuindoEmAtendimento: boolean;
  carregandoInicial?: boolean;
  redistribuirLeadsEmAtendimento: (modo?: "indefinidos" | "parados") => Promise<
    | { ok: false; erro: string }
    | {
        ok: true;
        avaliados: number;
        elegiveis: number;
        reatribuidos: number;
        ignoradosSemDestino: number;
      }
  >;
};

export function KanbanHeader({
  dialogNovoLeadAberto,
  setDialogNovoLeadAberto,
  criarLead,
  estagios,
  funcionarios,
  pdvs,
  perfil,
  telefoneNovoLead,
  setTelefoneNovoLead,
  valorNovoLead,
  setValorNovoLead,
  erroNovoLead,
  setErroNovoLead,
  criandoLead,
  cargoNovoLead,
  estagioAberto,
  estagioNovoLead,
  setEstagioNovoLead,
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
  totalLeads = 0,
  pendenciasCriticas = 0,
  origemStats,
  resumoOperacional,
  ultimaSincronizacaoWhatsapp,
  instanciasAtivasCount,
  notificacoesAtivadas,
  alternarNotificacoes,
  permissaoNotificacao,
  sincronizandoWhatsapp,
  sincronizarWhatsapp,
  redistribuindoEmAtendimento,
  carregandoInicial = false,
  redistribuirLeadsEmAtendimento,
}: KanbanHeaderProps) {
  const { addToast } = useToast();
  const [apenasAnuncios, setApenasAnuncios] = useState(false);
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);
  const filtrosAtivos =
    filtros.status !== "todos" ||
    filtros.gravidade !== "todas" ||
    filtros.tipo !== "todos" ||
    filtros.pdv !== null ||
    filtros.origem !== "todos" ||
    filtros.data_inicio !== null ||
    filtros.data_fim !== null;
  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const inputNomeNovoLeadRef = useRef<HTMLInputElement>(null);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setAgoraMs(Date.now()), 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const tempoDesdeSincronizacao = (() => {
    if (!ultimaSincronizacaoWhatsapp) {
      return null;
    }

    const diff = agoraMs - ultimaSincronizacaoWhatsapp.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "agora";
    }

    if (minutes < 60) {
      return `${minutes}min`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d`;
  })();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const alvoEditavel =
        alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        alvo instanceof HTMLSelectElement ||
        alvo?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputBuscaRef.current?.focus();
      }
      if (!alvoEditavel && !dialogNovoLeadAberto && e.key === "/") {
        e.preventDefault();
        inputBuscaRef.current?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === "n" && !dialogNovoLeadAberto) {
        e.preventDefault();
        setDialogNovoLeadAberto(true);
        setErroNovoLead(null);
      }
      if (e.key === "Escape" && document.activeElement === inputBuscaRef.current) {
        setBusca("");
        inputBuscaRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogNovoLeadAberto, setBusca, setDialogNovoLeadAberto, setErroNovoLead]);

  useEffect(() => {
    if (!dialogNovoLeadAberto) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputNomeNovoLeadRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [dialogNovoLeadAberto]);

  const limparFiltros = () => {
    setFiltros({
      status: "todos",
      gravidade: "todas",
      tipo: "todos",
      pdv: null,
      origem: "todos",
      data_inicio: null,
      data_fim: null,
    });
  };

  const metricasTopo = [
    {
      rotulo: "Ativos",
      valor: String(totalLeads),
      apoio: "no funil",
      destaque: false,
    },
    {
      rotulo: "Críticos",
      valor: String(pendenciasCriticas),
      apoio: "agir agora",
      destaque: pendenciasCriticas > 0,
    },
    {
      rotulo: "Parados +3d",
      valor: String(resumoOperacional.leadsParados),
      apoio: "sem avanço",
      destaque: resumoOperacional.leadsParados > 0,
    },
    {
      rotulo: "Sem responsável",
      valor: String(resumoOperacional.leadsSemResponsavel),
      apoio: "atribuir",
      destaque: resumoOperacional.leadsSemResponsavel > 0,
    },
    {
      rotulo: "Em aberto",
      valor: formataMoeda(resumoOperacional.valorTotalEmAberto),
      apoio: "valor visível",
      destaque: false,
      largo: true,
    },
  ];

  return (
    <section className="space-y-3" aria-labelledby="kanban-title">
      <div className="rounded-3xl border border-border/70 bg-background-surface p-4 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background-elevated text-info">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-disabled">
                Funil de atendimento
              </p>
              <h1 id="kanban-title" className="mt-1 text-2xl font-bold text-foreground">
                Leads
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
                Encontre contatos, veja urgências e mova cada lead para o próximo passo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-[680px] xl:grid-cols-6">
            {metricasTopo.map((metrica) => (
              <div
                key={metrica.rotulo}
                className={cn(
                  "rounded-2xl border px-3 py-2.5",
                  metrica.largo ? "sm:col-span-2 xl:col-span-2" : undefined,
                  metrica.destaque
                    ? "border-warning/35 bg-warning/10"
                    : "border-border/70 bg-background/70",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-disabled">
                  {metrica.rotulo}
                </p>
                {carregandoInicial ? (
                  <div
                    className={cn(
                      "mt-1 h-5 animate-pulse rounded-md bg-muted",
                      metrica.largo ? "w-32 sm:w-44" : "w-12",
                    )}
                  />
                ) : (
                  <p
                    className={cn(
                      "mt-1 break-words font-bold leading-tight text-foreground",
                      metrica.largo ? "text-base sm:text-lg" : "text-lg",
                    )}
                  >
                    {metrica.valor}
                  </p>
                )}
                <p className="mt-1 text-xs text-foreground-muted">{metrica.apoio}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-disabled" />
            <input
              ref={inputBuscaRef}
              type="text"
              placeholder="Buscar lead por nome ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar lead por nome ou telefone"
              className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-20 text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <span className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground-disabled sm:block">
              /
            </span>
            {busca ? (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1.5 text-foreground-muted transition-colors hover:bg-border hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant={modoFocoPendencias ? "default" : "outline"}
              size="sm"
              onClick={() => setModoFocoPendencias(!modoFocoPendencias)}
              className={cn(
                "h-11 rounded-2xl px-4 text-sm font-semibold",
                modoFocoPendencias
                  ? "bg-warning text-warning-foreground hover:bg-warning/90"
                  : "border-border bg-background",
              )}
              title={modoFocoPendencias ? "Mostrar todos os leads" : "Mostrar apenas leads com pendências"}
            >
              <Gauge className="mr-2 h-4 w-4" />
              {modoFocoPendencias ? "Urgências ativas" : "Modo urgência"}
            </Button>

            <Dialog
              open={dialogNovoLeadAberto}
              onOpenChange={(aberto) => {
                if (!aberto && criandoLead) {
                  return;
                }

                setDialogNovoLeadAberto(aberto);
                if (!aberto) {
                  setErroNovoLead(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="h-11 rounded-2xl bg-success px-4 font-semibold text-success-foreground shadow-sm transition-all duration-200 hover:bg-success/90 hover:shadow-md"
                  title="Atalho: Alt+N"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar lead</DialogTitle>
                </DialogHeader>

                <form className="space-y-3" onSubmit={criarLead}>
                  <Input
                    ref={inputNomeNovoLeadRef}
                    className="h-11 rounded-xl border-border bg-background-surface text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
                    name="nome"
                    placeholder="Nome"
                    disabled={criandoLead}
                    required
                  />
                  <Input
                    className="h-11 rounded-xl border-border bg-background-surface text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
                    name="telefone"
                    placeholder="Telefone"
                    value={telefoneNovoLead}
                    onChange={(e) => setTelefoneNovoLead(aplicaMascaraTelefoneBr(e.target.value))}
                    disabled={criandoLead}
                    required
                  />
                  <Input
                    className="h-11 rounded-xl border-border bg-background-surface text-sm text-foreground placeholder:text-foreground-disabled focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30"
                    name="valor_consorcio"
                    placeholder="Valor"
                    inputMode="numeric"
                    value={valorNovoLead}
                    onChange={(e) => setValorNovoLead(aplicaMascaraMoedaBr(e.target.value))}
                    disabled={criandoLead}
                    required
                  />

                  <input type="hidden" name="id_estagio" value={estagioNovoLead || estagioAberto} />
                  <input type="hidden" name="id_funcionario" value={cargoNovoLead?.id_funcionario ?? ""} />

                  <Select
                    disabled={criandoLead}
                    value={estagioNovoLead || estagioAberto}
                    onValueChange={setEstagioNovoLead}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-background-surface text-sm font-medium text-foreground-muted">
                      <SelectValue placeholder="Estágio" />
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
                    <div className="space-y-1.5">
                      <Select
                        disabled={criandoLead}
                        value={cargoNovoLead?.id_funcionario ?? undefined}
                        onValueChange={(valor) => setCargoNovoLead({ id_funcionario: valor })}
                      >
                        <SelectTrigger className="h-11 w-full rounded-xl border-border bg-background-surface text-sm font-medium text-foreground-muted">
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          <FuncionarioSelectOptions
                            funcionarios={funcionarios}
                            pdvs={pdvs}
                            funcionarioAtualId={cargoNovoLead?.id_funcionario}
                          />
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-foreground-muted">
                        {obterResumoFuncionario(
                          funcionarios.find((funcionario) => funcionario.id === cargoNovoLead?.id_funcionario),
                          pdvs,
                        )}
                      </p>
                    </div>
                  ) : null}

                  {erroNovoLead ? <p className="text-sm font-medium text-destructive">{erroNovoLead}</p> : null}

                  <ActionButton
                    className="w-full rounded-xl bg-foreground font-medium text-background hover:bg-foreground/90"
                    type="submit"
                    loading={criandoLead}
                    loadingText="Criando lead..."
                  >
                    Criar lead
                  </ActionButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-background-surface p-3 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {resumoPendencias ? (
              <div className="rounded-2xl border border-border bg-background px-3 py-2">
                <PendenciaBadge resumo={resumoPendencias} tamanho="md" modoExpansivo />
              </div>
            ) : null}

            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-muted px-2 py-1.5">
              <Filter className="h-3.5 w-3.5 text-foreground-disabled" />
              <Select
                value={filtros.status}
                onValueChange={(v) => setFiltros({ ...filtros, status: v as KanbanFilters["status"] })}
              >
                <SelectTrigger className="h-8 w-36 border-0 bg-transparent text-sm font-medium text-foreground-muted focus:ring-0">
                  <SelectValue placeholder="Pendência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com_pendencia">Com pendência</SelectItem>
                  <SelectItem value="sem_pendencia">Sem pendência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={filtros.origem}
              onValueChange={(v) => setFiltros({ ...filtros, origem: v as KanbanFilters["origem"] })}
            >
              <SelectTrigger
                className={cn(
                  "h-10 w-40 rounded-2xl border border-border bg-background text-sm font-medium",
                  filtros.origem !== "todos" ? "border-info/30 bg-info/10 text-info" : "text-foreground-muted",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {filtros.origem === "ANUNCIO_CTWA" ? <Megaphone className="h-3.5 w-3.5" /> : null}
                  {filtros.origem === "SINCRONIZACAO_WHATSAPP" ? (
                    <MessageCircle className="h-3.5 w-3.5" />
                  ) : null}
                  {filtros.origem === "MANUAL" ? <PenLine className="h-3.5 w-3.5" /> : null}
                  <SelectValue placeholder="Como chegou" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as origens</SelectItem>
                <SelectItem value="ANUNCIO_CTWA">Anúncio</SelectItem>
                <SelectItem value="SINCRONIZACAO_WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>

            {perfil === "EMPRESA" && pdvs.length > 0 ? (
              <Select
                value={filtros.pdv ?? "todos"}
                onValueChange={(v) => setFiltros({ ...filtros, pdv: v === "todos" ? null : v })}
              >
                <SelectTrigger className="h-10 w-40 rounded-2xl border border-border bg-background text-sm font-medium text-foreground-muted">
                  <Store className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as lojas</SelectItem>
                  {pdvs.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>
                      {pdv.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoKanban)}>
              <SelectTrigger className="h-10 w-40 rounded-2xl border border-border bg-background text-sm font-medium text-foreground-muted">
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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltrosAvancados((atual) => !atual)}
              aria-expanded={mostrarFiltrosAvancados}
              className="h-10 rounded-2xl px-3 text-sm font-medium"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Mais filtros
              <ChevronDown
                className={cn(
                  "ml-1 h-4 w-4 transition-transform",
                  mostrarFiltrosAvancados && "rotate-180",
                )}
              />
            </Button>

            {filtrosAtivos ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex h-10 items-center gap-2 rounded-2xl border border-border px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
                title="Limpar filtros"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-foreground-disabled 2xl:inline">
              Operação
            </span>
              <ActionButton
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl border-border bg-background"
                disabled={sincronizandoWhatsapp}
                loading={sincronizandoWhatsapp}
                loadingText="Sincronizando..."
                onClick={async () => {
                  const params = apenasAnuncios ? "?origem=anuncio" : "";
                  const resultado = await sincronizarWhatsapp(params);
                  if (!resultado.ok) {
                    addToast({
                      type: "error",
                      title: "Falha na sincronização",
                      description: resultado.erro ?? "Não foi possível importar novos contatos do WhatsApp.",
                    });
                    return;
                  }

                  const tipoImportacao = apenasAnuncios ? "de anúncios" : "do WhatsApp";
                  addToast({
                    type: "success",
                    title: "Sincronização concluída",
                    description:
                      resultado.criados && resultado.criados > 0
                        ? `${resultado.criados} novo(s) lead(s) importado(s) ${tipoImportacao}.`
                        : `Nenhum contato novo para importar ${tipoImportacao}.`,
                  });

                  if (resultado.instanciasIgnoradas && resultado.instanciasIgnoradas.length > 0) {
                    addToast({
                      type: "warning",
                      title: "Instâncias ignoradas",
                      description: resultado.instanciasIgnoradas
                        .map((instancia) => `${instancia.nome}: ${instancia.motivo}`)
                        .join(" "),
                    });
                  }
                }}
                title="Importar novos contatos das instâncias WhatsApp conectadas"
                iconeEsquerda={<RefreshCw className={cn("h-4 w-4", sincronizandoWhatsapp && "animate-spin")} />}
              >
                <span className="flex items-center gap-1.5">
                  <span>Importar</span>
                  {instanciasAtivasCount > 0 && (
                    <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
                      {instanciasAtivasCount}
                    </span>
                  )}
                </span>
                {ultimaSincronizacaoWhatsapp && !sincronizandoWhatsapp && (
                  <span className="ml-2 text-xs text-foreground-disabled">{tempoDesdeSincronizacao}</span>
                )}
              </ActionButton>

              <button
                type="button"
                onClick={() => setApenasAnuncios(!apenasAnuncios)}
                disabled={sincronizandoWhatsapp}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
                  sincronizandoWhatsapp && "cursor-not-allowed opacity-50",
                  apenasAnuncios
                    ? "border-info/30 bg-info/10 text-info"
                    : "border-border bg-background text-foreground-muted hover:bg-muted",
                )}
                title="Ao ativar, importa apenas leads originados de anúncios do WhatsApp"
              >
                <Megaphone className={cn("h-4 w-4", apenasAnuncios ? "text-info" : "text-foreground-disabled")} />
                Apenas anúncios
              </button>

              <ActionButton
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl border-border bg-background"
                disabled={redistribuindoEmAtendimento}
                loading={redistribuindoEmAtendimento}
                loadingText="Redistribuindo..."
                onClick={async () => {
                  const resultado = await redistribuirLeadsEmAtendimento("indefinidos");
                  if (!resultado.ok) {
                    addToast({
                      type: "error",
                      title: "Falha na redistribuição",
                      description: resultado.erro,
                    });
                    return;
                  }

                  addToast({
                    type: "success",
                    title: "Indefinidos redistribuídos",
                    description: `${resultado.reatribuidos} lead(s) reatribuído(s) de ${resultado.elegiveis} elegível(is).`,
                  });
                }}
                title="Reatribuir todos os leads no estágio Indefinido ao colaborador menos carregado"
                iconeEsquerda={<Filter className="h-4 w-4" />}
              >
                Reatribuir Indefinidos
              </ActionButton>

              <ActionButton
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl border-border bg-background"
                disabled={redistribuindoEmAtendimento}
                loading={redistribuindoEmAtendimento}
                loadingText="Redistribuindo..."
                onClick={async () => {
                  const resultado = await redistribuirLeadsEmAtendimento("parados");
                  if (!resultado.ok) {
                    addToast({
                      type: "error",
                      title: "Falha na redistribuição",
                      description: resultado.erro,
                    });
                    return;
                  }

                  addToast({
                    type: "success",
                    title: "Parados redistribuídos",
                    description: `${resultado.reatribuidos} lead(s) reatribuído(s) de ${resultado.elegiveis} elegível(is).`,
                  });
                }}
                title="Reatribuir leads parados (sem atualização há 3+ dias) ao colaborador menos carregado"
                iconeEsquerda={<RefreshCw className="h-4 w-4" />}
              >
                Reatribuir Parados
              </ActionButton>

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
                  "h-10 rounded-2xl px-3 text-sm font-medium",
                  notificacoesAtivadas
                    ? "border-info/30 bg-info/10 text-info hover:bg-info/15"
                    : "border-border",
                )}
                title={
                  notificacoesAtivadas
                    ? "Notificações ativadas - clique para desativar"
                    : "Ativar notificações de novas pendências"
                }
              >
                {notificacoesAtivadas ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                Alertas
              </Button>
            </div>

        </div>

        {mostrarFiltrosAvancados ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-dashed border-border/70 bg-background p-3 md:grid-cols-[180px_1fr] md:items-center">
            <Select
              value={filtros.gravidade}
              onValueChange={(v) => setFiltros({ ...filtros, gravidade: v as KanbanFilters["gravidade"] })}
            >
              <SelectTrigger className="h-10 rounded-2xl border-border bg-background-surface text-sm font-medium text-foreground-muted">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as gravidades</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alerta">Alerta</SelectItem>
                <SelectItem value="info">Informativa</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid gap-2 sm:grid-cols-[150px_150px_1fr] sm:items-center">
              <Input
                type="date"
                value={filtros.data_inicio || ""}
                onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value || null })}
                className="h-10 rounded-2xl border-border bg-background-surface text-sm text-foreground"
                aria-label="Data inicial"
              />
              <Input
                type="date"
                value={filtros.data_fim || ""}
                onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value || null })}
                className="h-10 rounded-2xl border-border bg-background-surface text-sm text-foreground"
                aria-label="Data final"
              />
              <p className="text-xs text-foreground-muted">
                O período filtra pela data de criação do lead.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground-muted">
          <span className="font-medium text-foreground">Origem dos leads visíveis:</span>
          <span>{origemStats.anuncios} anúncio</span>
          <span>{origemStats.whatsapp} WhatsApp</span>
          <span>{origemStats.manual} manual</span>
          {filtrosAtivos ? <span className="font-medium text-info">Filtros ativos</span> : null}
        </div>
      </div>
    </section>
  );
}
