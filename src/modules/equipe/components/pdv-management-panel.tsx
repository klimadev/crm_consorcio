"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";
import { Avatar } from "./shared/avatar";
import { StatusBadge } from "./shared/status-badge";

type PdvManagementPanelProps = {
  vm: UseEquipeModuleReturn;
  drawerNovoPdvAberto: boolean;
  setDrawerNovoPdvAberto: (aberto: boolean) => void;
};

export function PdvManagementPanel({ vm, drawerNovoPdvAberto, setDrawerNovoPdvAberto }: PdvManagementPanelProps) {
  const VALOR_SEM_INSTANCIA = "__SEM_INSTANCIA__";
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [instanciaEdicao, setInstanciaEdicao] = useState<string>("");
  const [drawerColaboradoresAberto, setDrawerColaboradoresAberto] = useState(false);
  const [pdvColaboradoresId, setPdvColaboradoresId] = useState<string | null>(null);
  const [buscaColaboradoresDrawer, setBuscaColaboradoresDrawer] = useState("");
  const [ordenacaoDrawer, setOrdenacaoDrawer] = useState<"nome" | "email" | "cargo" | "status">("nome");
  const [direcaoDrawer, setDirecaoDrawer] = useState<"asc" | "desc">("asc");
  const [nomeNovoPdv, setNomeNovoPdv] = useState("");
  const [editandoFuncionarioNoDrawer, setEditandoFuncionarioNoDrawer] = useState<string | null>(null);
  const [novoColaboradorExpandido, setNovoColaboradorExpandido] = useState(false);
  const [cadastroSucesso, setCadastroSucesso] = useState(false);
  const [errosLocal, setErrosLocal] = useState<{ nome?: string; email?: string; senha?: string }>({});
  const [dadosEdicaoFuncionario, setDadosEdicaoFuncionario] = useState<{ nome: string; email: string; cargo: string; id_pdv: string } | null>(null);
  const [errosEdicao, setErrosEdicao] = useState<Record<string, string>>({});

  const totalPdvsSemInstancia = useMemo(() => vm.pdvs.filter((pdv) => !pdv.whatsapp_instancia).length, [vm.pdvs]);

  const pdvSelecionadoNoDrawer = useMemo(
    () => vm.pdvs.find((pdv) => pdv.id === pdvColaboradoresId) ?? null,
    [vm.pdvs, pdvColaboradoresId],
  );

  const colaboradoresDrawer = useMemo(() => {
    const termo = buscaColaboradoresDrawer.trim().toLowerCase();
    const base = pdvSelecionadoNoDrawer?.funcionarios ?? [];

    const enriquecidos = base.map((funcionarioResumo) => {
      const completo = vm.funcionarios.find((funcionario) => funcionario.id === funcionarioResumo.id);

      return {
        id: funcionarioResumo.id,
        nome: funcionarioResumo.nome,
        cargo: funcionarioResumo.cargo,
        email: completo?.email ?? "-",
        ativo: completo?.ativo ?? funcionarioResumo.ativo ?? true,
      };
    });

    if (!termo) {
      return enriquecidos;
    }

    return enriquecidos.filter((funcionario) => {
      const alvo = `${funcionario.nome} ${funcionario.email} ${funcionario.cargo}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [buscaColaboradoresDrawer, pdvSelecionadoNoDrawer, vm.funcionarios]);

  const colaboradoresDrawerOrdenados = useMemo(() => {
    const lista = [...colaboradoresDrawer];
    lista.sort((a, b) => {
      const valorA = ordenacaoDrawer === "status" ? (a.ativo ? "ATIVO" : "INATIVO") : (a[ordenacaoDrawer] ?? "");
      const valorB = ordenacaoDrawer === "status" ? (b.ativo ? "ATIVO" : "INATIVO") : (b[ordenacaoDrawer] ?? "");
      const comparacao = String(valorA).localeCompare(String(valorB), "pt-BR", { sensitivity: "base" });
      return direcaoDrawer === "asc" ? comparacao : -comparacao;
    });
    return lista;
  }, [colaboradoresDrawer, direcaoDrawer, ordenacaoDrawer]);

  const podeGerenciarColaboradorNoDrawer = vm.podeGerenciarEmpresa || vm.podeExecutarAcoesLote;
  const opcoesDestinoLoteNoDrawer = useMemo(() => {
    const idPdvAtual = pdvSelecionadoNoDrawer?.id;
    if (!idPdvAtual) {
      return [];
    }

    return vm.funcionarios.filter(
      (funcionario) =>
        funcionario.ativo &&
        funcionario.pdv?.id === idPdvAtual &&
        !vm.idsSelecionados.includes(funcionario.id),
    );
  }, [pdvSelecionadoNoDrawer?.id, vm.funcionarios, vm.idsSelecionados]);
  const todosSelecionadosNoDrawer =
    colaboradoresDrawerOrdenados.length > 0 &&
    colaboradoresDrawerOrdenados.every((funcionario) => vm.idsSelecionados.includes(funcionario.id));

  function alternarOrdenacaoDrawer(campo: "nome" | "email" | "cargo" | "status") {
    if (ordenacaoDrawer === campo) {
      setDirecaoDrawer((atual) => (atual === "asc" ? "desc" : "asc"));
      return;
    }
    setOrdenacaoDrawer(campo);
    setDirecaoDrawer("asc");
  }

  function iconeOrdenacaoDrawer(campo: "nome" | "email" | "cargo" | "status") {
    if (ordenacaoDrawer !== campo) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-foreground-disabled" />;
    }
    return direcaoDrawer === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  }

  const aoCriarPdv = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const nome = nomeNovoPdv.trim();
    const criou = await vm.criarPdv(nome);

    if (criou) {
      setNomeNovoPdv("");
      setDrawerNovoPdvAberto(false);
    }
  };

  const iniciarEdicaoPdv = (id: string, nome: string, id_whatsapp_instancia?: string | null) => {
    vm.setPdvEmEdicao({ id, nome, id_whatsapp_instancia });
    setNomeEdicao(nome);
    setInstanciaEdicao(id_whatsapp_instancia ?? "");
  };

  const cancelarEdicaoPdv = () => {
    vm.setPdvEmEdicao(null);
    setNomeEdicao("");
    setInstanciaEdicao("");
  };

  const salvarEdicaoPdv = async () => {
    if (!vm.pdvEmEdicao) {
      return;
    }

    const ok = await vm.editarPdv(vm.pdvEmEdicao.id, nomeEdicao, instanciaEdicao || null);
    if (ok) {
      cancelarEdicaoPdv();
    }
  };

  const confirmarExclusaoPdv = async () => {
    if (!vm.pdvParaExcluir) {
      return;
    }

    await vm.excluirPdv(vm.pdvParaExcluir.id);
    vm.setPdvParaExcluir(null);
  };

  const abrirDrawerColaboradores = (id: string) => {
    setPdvColaboradoresId(id);
    setBuscaColaboradoresDrawer("");
    setNovoColaboradorExpandido(false);
    setCadastroSucesso(false);
    setErrosLocal({});
    setDrawerColaboradoresAberto(true);
  };

  const handleSubmitCadastroRapido = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrosLocal({});
    setCadastroSucesso(false);

    const dados = new FormData(evento.currentTarget);
    const nome = (dados.get("nome") as string)?.trim() ?? "";
    const email = (dados.get("email") as string)?.trim() ?? "";
    const senha = (dados.get("senha") as string) ?? "";

    const novosErros: { nome?: string; email?: string; senha?: string } = {};
    if (!nome || nome.length < 2) {
      novosErros.nome = "Nome deve ter ao menos 2 caracteres";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      novosErros.email = "E-mail invalido";
    }
    if (!senha || senha.length < 4) {
      novosErros.senha = "Senha deve ter ao menos 4 caracteres";
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosLocal(novosErros);
      return;
    }

    const sucesso = await vm.adicionarFuncionario(evento);
    if (sucesso) {
      setCadastroSucesso(true);
      setNovoColaboradorExpandido(false);
      setTimeout(() => setCadastroSucesso(false), 3000);
    }
  };

  const iniciarEdicaoFuncionarioDrawer = (id: string) => {
    const func = vm.funcionarios.find((item) => item.id === id);
    if (!func) {
      return;
    }

    setDadosEdicaoFuncionario({
      nome: func.nome,
      email: func.email,
      cargo: func.cargo,
      id_pdv: func.pdv?.id ?? "",
    });
    setErrosEdicao({});
    setEditandoFuncionarioNoDrawer(id);
  };

  const cancelarEdicaoFuncionarioDrawer = () => {
    setEditandoFuncionarioNoDrawer(null);
    setDadosEdicaoFuncionario(null);
    setErrosEdicao({});
  };

  const salvarEdicaoFuncionarioDrawer = async () => {
    if (!dadosEdicaoFuncionario || !editandoFuncionarioNoDrawer) {
      return;
    }

    const novosErros: Record<string, string> = {};
    if (!dadosEdicaoFuncionario.nome.trim() || dadosEdicaoFuncionario.nome.trim().length < 2) {
      novosErros.nome = "Nome deve ter ao menos 2 caracteres.";
    }
    if (!dadosEdicaoFuncionario.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dadosEdicaoFuncionario.email.trim())) {
      novosErros.email = "E-mail invalido.";
    }
    if (!dadosEdicaoFuncionario.id_pdv.trim()) {
      novosErros.id_pdv = "PDV obrigatorio.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosEdicao(novosErros);
      return;
    }

    const func = vm.funcionarios.find((f) => f.id === editandoFuncionarioNoDrawer);
    if (!func) {
      return;
    }

    vm.iniciarEdicao(func);
    const ok = await vm.salvarEdicaoAtual(dadosEdicaoFuncionario);
    if (ok) {
      cancelarEdicaoFuncionarioDrawer();
    }
  };

  if (vm.carregandoPdvs) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-muted p-6 text-sm text-foreground-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando gestao de PDVs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">PDVs e operacao</p>
          <p className="text-sm text-foreground-muted">Clique no card para abrir a gestao da equipe do PDV no drawer lateral.</p>
        </div>
        {totalPdvsSemInstancia > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertCircle className="h-4 w-4" />
            {totalPdvsSemInstancia} PDV(s) sem instancia WhatsApp vinculada
          </div>
        ) : null}
      </div>

      {vm.erroGestaoPdvs ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {vm.erroGestaoPdvs}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {vm.pdvs.map((pdv) => {
          const emEdicao = vm.pdvEmEdicao?.id === pdv.id;
          const salvando = vm.salvandoPdvId === pdv.id;
          const temColaboradores = (pdv.funcionarios ?? []).length > 0;
          const colaboradoresPreview = pdv.funcionarios?.slice(0, 4) ?? [];
          const excedente = Math.max(0, (pdv.funcionarios?.length ?? 0) - 4);

          return (
            <article
              key={pdv.id}
              className={cn(
                "group relative cursor-pointer space-y-3 overflow-hidden rounded-2xl border bg-background-surface p-4 transition-all duration-200",
                "hover:-translate-y-1 hover:border-info/30 hover:shadow-xl",
                "active:scale-[0.99]",
                pdv.alerta_configuracao
                  ? "border-warning/25 bg-gradient-to-br from-warning/10 via-background-surface to-background shadow-[0_10px_30px_rgba(217,119,6,0.12)]"
                  : "border-border/70 shadow-[0_8px_26px_rgba(15,23,42,0.08)]",
              )}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-info/15 blur-2xl" />
              <div className="pointer-events-none absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10">
                  <svg className="h-3 w-3 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              <div className="flex items-start justify-between">
                {emEdicao ? (
                  <div className="flex flex-1 flex-col gap-2">
                    <Input value={nomeEdicao} onChange={(evento) => setNomeEdicao(evento.target.value)} disabled={salvando} className="h-9" placeholder="Nome do PDV" />
                    <Select value={instanciaEdicao || VALOR_SEM_INSTANCIA} onValueChange={(valor) => setInstanciaEdicao(valor === VALOR_SEM_INSTANCIA ? "" : valor)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione uma instancia WhatsApp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={VALOR_SEM_INSTANCIA}>Nenhuma</SelectItem>
                        {vm.instancias.map((instancia) => (
                          <SelectItem key={instancia.id} value={instancia.id}>
                            {instancia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="rounded-lg bg-success text-success-foreground hover:bg-success/90" disabled={salvando} onClick={() => void salvarEdicaoPdv()}>
                        {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={salvando} onClick={cancelarEdicaoPdv}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="flex-1 text-left group/btn" onClick={() => abrirDrawerColaboradores(pdv.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover/btn:text-info">{pdv.nome}</h3>
                        {temColaboradores ? (
                          <div className="mt-2 flex items-center">
                            <div className="flex -space-x-2">
                              {colaboradoresPreview.map((func) => (
                                <Avatar key={func.id} nome={func.nome} tamanho="sm" />
                              ))}
                              {excedente > 0 ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-background bg-muted text-xs font-medium text-foreground-muted">
                                  +{excedente}
                                </div>
                              ) : null}
                            </div>
                            <span className="ml-2 text-xs text-foreground-muted">{pdv.funcionarios?.length} colaborador(es)</span>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-foreground-disabled">Sem colaboradores</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-foreground-disabled" />
                      </div>
                    </div>
                    {pdv.whatsapp_instancia ? (
                      <p className="mt-2 text-xs text-success">WhatsApp: {pdv.whatsapp_instancia.nome}</p>
                    ) : (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-2.5 py-2 text-xs text-warning">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{pdv.alerta_configuracao?.mensagem ?? "Sem instancia WhatsApp vinculada."}</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Dialog
        open={Boolean(vm.pdvParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            vm.setPdvParaExcluir(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir PDV</DialogTitle>
            <DialogDescription>Esta acao remove o PDV permanentemente. Nao e possivel desfazer.</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-foreground-muted">
            Confirma a exclusao do PDV <span className="font-semibold">{vm.pdvParaExcluir?.nome}</span>?
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => vm.setPdvParaExcluir(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="bg-destructive hover:bg-destructive/90" onClick={() => void confirmarExclusaoPdv()} disabled={!vm.pdvParaExcluir || vm.excluindoPdvId === vm.pdvParaExcluir.id}>
              {vm.pdvParaExcluir && vm.excluindoPdvId === vm.pdvParaExcluir.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerNovoPdvAberto} onOpenChange={setDrawerNovoPdvAberto}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Novo PDV</SheetTitle>
            <SheetDescription>Crie um novo ponto de venda para distribuir equipe e operacao.</SheetDescription>
          </SheetHeader>

          <form onSubmit={aoCriarPdv} className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do PDV</label>
              <Input name="nome" placeholder="Ex.: Centro Comercial" required value={nomeNovoPdv} onChange={(evento) => setNomeNovoPdv(evento.target.value)} disabled={vm.criandoPdv} className="h-10" />
            </div>

            <SheetFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" disabled={vm.criandoPdv || !nomeNovoPdv.trim()} className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
                {vm.criandoPdv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {vm.criandoPdv ? "Criando PDV..." : "Criar PDV"}
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl" disabled={vm.criandoPdv} onClick={() => setDrawerNovoPdvAberto(false)}>
                Cancelar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={drawerColaboradoresAberto}
        onOpenChange={(aberto) => {
          setDrawerColaboradoresAberto(aberto);
          if (!aberto) {
            setPdvColaboradoresId(null);
            setEditandoFuncionarioNoDrawer(null);
            setNovoColaboradorExpandido(false);
            setCadastroSucesso(false);
            setErrosLocal({});
          }
        }}
      >
        <SheetContent side="right" className="h-[100dvh] max-h-[100dvh] w-full max-w-md overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            {editandoFuncionarioNoDrawer ? (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={cancelarEdicaoFuncionarioDrawer}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <SheetTitle>Editar colaborador</SheetTitle>
                      <SheetDescription>Altere os dados do colaborador.</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nome</label>
                      <Input value={dadosEdicaoFuncionario?.nome ?? ""} onChange={(e) => setDadosEdicaoFuncionario((prev) => (prev ? { ...prev, nome: e.target.value } : null))} placeholder="Nome completo" className={errosEdicao.nome ? "border-destructive/30" : ""} />
                      {errosEdicao.nome ? <p className="text-xs text-destructive">{errosEdicao.nome}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">E-mail</label>
                      <Input type="email" value={dadosEdicaoFuncionario?.email ?? ""} onChange={(e) => setDadosEdicaoFuncionario((prev) => (prev ? { ...prev, email: e.target.value } : null))} placeholder="email@exemplo.com" className={errosEdicao.email ? "border-destructive/30" : ""} />
                      {errosEdicao.email ? <p className="text-xs text-destructive">{errosEdicao.email}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Cargo</label>
                      <Select value={dadosEdicaoFuncionario?.cargo ?? ""} onValueChange={(valor) => setDadosEdicaoFuncionario((prev) => (prev ? { ...prev, cargo: valor } : null))}>
                        <SelectTrigger className={errosEdicao.cargo ? "border-destructive/30" : ""}><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                          <SelectItem value="GERENTE">Gerente</SelectItem>
                          <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      {errosEdicao.cargo ? <p className="text-xs text-destructive">{errosEdicao.cargo}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">PDV</label>
                      <Select value={dadosEdicaoFuncionario?.id_pdv ?? ""} onValueChange={(valor) => setDadosEdicaoFuncionario((prev) => (prev ? { ...prev, id_pdv: valor } : null))}>
                        <SelectTrigger className={errosEdicao.id_pdv ? "border-destructive/30" : ""}><SelectValue placeholder="Selecione o PDV" /></SelectTrigger>
                        <SelectContent>
                          {vm.pdvs.map((pdv) => (
                            <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errosEdicao.id_pdv ? <p className="text-xs text-destructive">{errosEdicao.id_pdv}</p> : null}
                    </div>
                    {vm.statusSalvamento.id === editandoFuncionarioNoDrawer && vm.statusSalvamento.estado === "error" ? (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{vm.statusSalvamento.mensagem}</div>
                    ) : null}
                  </div>
                </div>

                <SheetFooter className="mt-auto px-4 pb-4 pt-4">
                  <Button className="w-full" onClick={salvarEdicaoFuncionarioDrawer} disabled={vm.statusSalvamento.id === editandoFuncionarioNoDrawer && vm.statusSalvamento.estado === "saving"}>
                    {vm.statusSalvamento.id === editandoFuncionarioNoDrawer && vm.statusSalvamento.estado === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {vm.statusSalvamento.id === editandoFuncionarioNoDrawer && vm.statusSalvamento.estado === "saving" ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={cancelarEdicaoFuncionarioDrawer}>Cancelar</Button>
                </SheetFooter>
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                  <div className="mt-6 space-y-3">
                    <SheetHeader className="px-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <SheetTitle>{pdvSelecionadoNoDrawer ? `Colaboradores - ${pdvSelecionadoNoDrawer.nome}` : "Colaboradores do PDV"}</SheetTitle>
                          <SheetDescription>Gestao completa dos colaboradores deste PDV no mesmo fluxo da tabela principal.</SheetDescription>
                        </div>
                        {pdvSelecionadoNoDrawer && vm.podeGerenciarEmpresa ? (
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-foreground-muted" onClick={() => iniciarEdicaoPdv(pdvSelecionadoNoDrawer.id, pdvSelecionadoNoDrawer.nome, pdvSelecionadoNoDrawer.id_whatsapp_instancia)}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar PDV
                            </Button>
                            {pdvSelecionadoNoDrawer.funcionarios?.length === 0 ? (
                              <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => vm.setPdvParaExcluir({ id: pdvSelecionadoNoDrawer.id, nome: pdvSelecionadoNoDrawer.nome })}>
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </SheetHeader>

                    {pdvSelecionadoNoDrawer?.alerta_configuracao ? (
                      <div className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-3 text-sm text-warning">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-semibold">PDV fora da sincronizacao automatica</p>
                            <p className="text-xs text-warning/90">{pdvSelecionadoNoDrawer.alerta_configuracao.mensagem}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-border bg-background-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><UserPlus className="h-5 w-5 text-success" /></div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Adicionar novo colaborador</p>
                            <p className="text-xs text-foreground-muted">Cadastrar em <span className="font-medium text-success">{pdvSelecionadoNoDrawer?.nome}</span></p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className={cn("h-9 rounded-lg px-4 font-medium", novoColaboradorExpandido ? "bg-muted text-foreground-muted hover:bg-muted/80" : "bg-success text-success-foreground hover:bg-success/90")}
                          onClick={() => {
                            vm.setCargoSelecionado("COLABORADOR");
                            vm.setPdvSelecionado(pdvSelecionadoNoDrawer?.id ?? "");
                            setNovoColaboradorExpandido((atual) => !atual);
                          }}
                        >
                          {novoColaboradorExpandido ? "Cancelar" : "Novo"}
                        </Button>
                      </div>

                      {novoColaboradorExpandido ? (
                        <form className="mt-4 space-y-3" onSubmit={handleSubmitCadastroRapido}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-foreground-muted">Nome</label>
                              <Input name="nome" placeholder="Nome completo" required className={cn("h-10 rounded-lg bg-background-surface", errosLocal.nome ? "border-destructive/30 bg-destructive/10" : "border-border focus:border-ring")} />
                              {errosLocal.nome ? <p className="mt-1 text-xs text-destructive">{errosLocal.nome}</p> : null}
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-foreground-muted">Cargo</label>
                              <Select name="cargo" defaultValue="COLABORADOR">
                                <SelectTrigger className="h-10 rounded-lg border-border bg-background-surface"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                                  <SelectItem value="GERENTE">Gerente</SelectItem>
                                  <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-foreground-muted">E-mail</label>
                            <Input name="email" type="email" placeholder="email@exemplo.com" required className={cn("h-10 rounded-lg bg-background-surface", errosLocal.email ? "border-destructive/30 bg-destructive/10" : "border-border focus:border-ring")} />
                            {errosLocal.email ? <p className="mt-1 text-xs text-destructive">{errosLocal.email}</p> : null}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-foreground-muted">Senha temporaria</label>
                            <Input name="senha" type="password" placeholder="Minimo 4 caracteres" required className={cn("h-10 rounded-lg bg-background-surface", errosLocal.senha ? "border-destructive/30 bg-destructive/10" : "border-border focus:border-ring")} />
                            {errosLocal.senha ? <p className="mt-1 text-xs text-destructive">{errosLocal.senha}</p> : null}
                          </div>
                          <input type="hidden" name="id_pdv" value={pdvSelecionadoNoDrawer?.id ?? ""} />
                          {vm.erroCadastro ? (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <p className="text-sm text-destructive">{vm.erroCadastro}</p>
                            </div>
                          ) : null}
                          <Button type="submit" className="h-10 w-full rounded-lg bg-success font-medium text-success-foreground hover:bg-success/90" disabled={vm.carregandoCadastro}>
                            {vm.carregandoCadastro ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Cadastrando...
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-2 h-4 w-4" />Cadastrar colaborador
                              </>
                            )}
                          </Button>
                        </form>
                      ) : null}

                      {cadastroSucesso ? (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2.5 shadow-sm">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" /></div>
                          <div>
                            <p className="text-xs font-semibold text-success">Colaborador cadastrado!</p>
                            <p className="text-[10px] text-success/90">Atualizando lista automaticamente...</p>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-border bg-muted px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Total</p>
                          <p className="text-sm font-semibold text-foreground">{colaboradoresDrawerOrdenados.length} colaborador(es)</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Ativos</p>
                          <p className="text-sm font-semibold text-success">{colaboradoresDrawerOrdenados.filter((funcionario) => funcionario.ativo).length}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Inativos</p>
                          <p className="text-sm font-semibold text-amber-700">{colaboradoresDrawerOrdenados.filter((funcionario) => !funcionario.ativo).length}</p>
                        </div>
                      </div>

                      <div className="relative mt-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-disabled" />
                        <Input value={buscaColaboradoresDrawer} onChange={(evento) => setBuscaColaboradoresDrawer(evento.target.value)} placeholder="Buscar por nome, email ou cargo" className="pl-9" />
                      </div>

                      {vm.podeExecutarAcoesLote ? (
                        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Acoes em lote no PDV</p>
                            <p className="text-xs text-foreground-muted">{vm.idsSelecionados.length} selecionado(s)</p>
                          </div>

                          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                            <Select value={vm.acaoLote} onValueChange={(valor) => vm.setAcaoLote(valor as "ATIVAR" | "INATIVAR" | "ALTERAR_CARGO" | "ALTERAR_PDV")}>
                              <SelectTrigger className="h-9 rounded-lg border-border bg-background-surface"><SelectValue placeholder="Acao" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ATIVAR">Reativar</SelectItem>
                                <SelectItem value="INATIVAR">Inativar</SelectItem>
                                <SelectItem value="ALTERAR_CARGO">Mudar cargo</SelectItem>
                                <SelectItem value="ALTERAR_PDV">Mudar PDV</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button type="button" className="rounded-lg bg-foreground text-background hover:bg-foreground/90" disabled={vm.executandoLote || !vm.lotePodeExecutar} onClick={() => void vm.executarAcaoLote()}>
                              {vm.executandoLote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {vm.executandoLote ? "Aplicando..." : "Aplicar"}
                            </Button>
                          </div>

                          {vm.acaoLote === "ALTERAR_CARGO" ? (
                            <Select value={vm.cargoLote} onValueChange={vm.setCargoLote}>
                              <SelectTrigger className="h-9 rounded-lg border-border bg-background-surface"><SelectValue placeholder="Novo cargo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                                <SelectItem value="GERENTE">GERENTE</SelectItem>
                                <SelectItem value="ADMINISTRADOR">ADMINISTRADOR</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : null}

                          {vm.acaoLote === "ALTERAR_PDV" ? (
                            <Select value={vm.pdvLote} onValueChange={vm.setPdvLote}>
                              <SelectTrigger className="h-9 rounded-lg border-border bg-background-surface"><SelectValue placeholder="Novo PDV" /></SelectTrigger>
                              <SelectContent>
                                {vm.pdvs.map((pdv) => (
                                  <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}

                          {vm.acaoLote === "INATIVAR" ? (
                            <>
                              <Select value={vm.destinoInativacaoLote} onValueChange={vm.setDestinoInativacaoLote}>
                                <SelectTrigger className="h-9 rounded-lg border-border bg-background-surface"><SelectValue placeholder="Destino para os leads" /></SelectTrigger>
                                <SelectContent>
                                  {opcoesDestinoLoteNoDrawer.map((funcionario) => (
                                    <SelectItem key={funcionario.id} value={funcionario.id}>{funcionario.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input value={vm.observacaoLote} onChange={(evento) => vm.setObservacaoLote(evento.target.value)} placeholder="Observacao opcional da inativacao" className="h-9 rounded-lg border-border bg-background-surface" />
                            </>
                          ) : null}

                          <div className={cn("rounded-xl border px-3 py-2 text-sm", vm.lotePendencia ? "border-amber-200 bg-amber-50 text-amber-900" : "border-success/20 bg-success/10 text-success")}>
                            <p className="font-medium">{vm.lotePendencia ?? vm.loteResumoAcao}</p>
                          </div>

                          {vm.erroLote ? (
                            <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>{vm.erroLote}</p>
                            </div>
                          ) : null}

                          {vm.resultadoLote ? (
                            <div className="rounded-xl border border-success/25 bg-success/10 px-3 py-3 text-sm text-success">
                              <p className="font-medium">{vm.resultadoLote.atualizados} colaborador(es) atualizado(s).</p>
                              {vm.resultadoLote.falhas.length > 0 ? <p className="mt-1 text-xs text-success/90">{vm.resultadoLote.falhas.length} item(ns) tiveram falha e permaneceram sem alteracao.</p> : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted p-2">
                        {vm.podeExecutarAcoesLote ? (
                          <label className="mr-1 flex items-center gap-2 rounded-lg bg-background-surface px-2 py-1 text-xs text-foreground-muted">
                            <input
                              type="checkbox"
                              checked={todosSelecionadosNoDrawer}
                              onChange={(evento) => {
                                colaboradoresDrawerOrdenados.forEach((funcionario) => vm.alternarSelecao(funcionario.id, evento.target.checked));
                              }}
                              className="h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring"
                            />
                            Selecionar todos
                          </label>
                        ) : null}
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => alternarOrdenacaoDrawer("nome")}>Nome {iconeOrdenacaoDrawer("nome")}</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => alternarOrdenacaoDrawer("email")}>Email {iconeOrdenacaoDrawer("email")}</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => alternarOrdenacaoDrawer("cargo")}>Cargo {iconeOrdenacaoDrawer("cargo")}</Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => alternarOrdenacaoDrawer("status")}>Status {iconeOrdenacaoDrawer("status")}</Button>
                      </div>

                      {colaboradoresDrawerOrdenados.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-border bg-background-surface p-4 text-sm text-foreground-muted">Nenhum colaborador encontrado neste PDV.</div>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {colaboradoresDrawerOrdenados.map((funcionario) => (
                            <li key={funcionario.id} className={cn("rounded-xl border bg-background-surface px-3 py-3", funcionario.ativo ? "border-border" : "border-amber-200 bg-amber-50/50")}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                  <Avatar nome={funcionario.nome} tamanho="sm" />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium text-foreground">{funcionario.nome}</p>
                                      <StatusBadge ativo={funcionario.ativo} />
                                    </div>
                                    <p className="truncate text-xs text-foreground-muted">{funcionario.email}</p>
                                    <p className="mt-1 text-xs uppercase tracking-wide text-foreground-muted">{funcionario.cargo}</p>
                                    {!funcionario.ativo ? <p className="mt-2 text-xs text-amber-700">Colaborador inativo. Pode ser reativado a qualquer momento.</p> : null}
                                  </div>
                                </div>

                                {vm.podeExecutarAcoesLote ? (
                                  <input type="checkbox" checked={vm.idsSelecionados.includes(funcionario.id)} onChange={(evento) => vm.alternarSelecao(funcionario.id, evento.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-foreground-muted focus:ring-ring" />
                                ) : null}
                              </div>

                              {podeGerenciarColaboradorNoDrawer ? (
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                  <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-foreground-muted" onClick={() => iniciarEdicaoFuncionarioDrawer(funcionario.id)}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                                  </Button>
                                  {funcionario.ativo ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => {
                                        const alvo = vm.funcionarios.find((item) => item.id === funcionario.id);
                                        if (alvo) {
                                          vm.abrirModalInativacao(alvo);
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />Inativar
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 rounded-lg bg-success text-success-foreground hover:bg-success/90"
                                      onClick={() => {
                                        const alvo = vm.funcionarios.find((item) => item.id === funcionario.id);
                                        if (alvo) {
                                          void vm.reativarFuncionarioIndividual(alvo);
                                        }
                                      }}
                                    >
                                      Reativar
                                    </Button>
                                  )}
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
