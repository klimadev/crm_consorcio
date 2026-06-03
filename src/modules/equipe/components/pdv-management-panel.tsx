"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type PdvManagementPanelProps = {
  vm: UseEquipeModuleReturn;
  drawerNovoPdvAberto: boolean;
  setDrawerNovoPdvAberto: (aberto: boolean) => void;
};

export function PdvManagementPanel({ vm, drawerNovoPdvAberto, setDrawerNovoPdvAberto }: PdvManagementPanelProps) {
  const VALOR_SEM_INSTANCIA = "__SEM_INSTANCIA__";
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [instanciaEdicao, setInstanciaEdicao] = useState<string>("");
  const [nomeNovoPdv, setNomeNovoPdv] = useState("");

  const totalPdvsSemInstancia = useMemo(() => vm.pdvs.filter((pdv) => !pdv.whatsapp_instancia).length, [vm.pdvs]);

  const podeEditarPdv = (pdvId: string) =>
    vm.podeGerenciarEmpresa || (vm.idPdvGerenciado != null && vm.idPdvGerenciado === pdvId);

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
    if (!vm.pdvEmEdicao) return;
    const ok = await vm.editarPdv(vm.pdvEmEdicao.id, nomeEdicao, instanciaEdicao || null);
    if (ok) cancelarEdicaoPdv();
  };

  const aoCriarPdv = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const nome = nomeNovoPdv.trim();
    const criou = await vm.criarPdv(nome);
    if (criou) {
      setNomeNovoPdv("");
      setDrawerNovoPdvAberto(false);
    }
  };

  const confirmarExclusaoPdv = async () => {
    if (!vm.pdvParaExcluir) return;
    await vm.excluirPdv(vm.pdvParaExcluir.id);
    vm.setPdvParaExcluir(null);
  };

  const handleCardClick = (pdvId: string) => {
    // Clica no card para filtrar a tabela por este PDV
    vm.atualizarParametrosUrl({ id_pdv: pdvId }, true);
  };

  if (vm.carregandoPdvs) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-muted p-6 text-sm text-foreground-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando gestão de PDVs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">PDVs e operação</p>
          <p className="text-sm text-foreground-muted">Clique no card para filtrar a equipe por PDV. Use o lápis para editar.</p>
        </div>
        {totalPdvsSemInstancia > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">
            <AlertCircle className="h-4 w-4" />
            {totalPdvsSemInstancia} PDV(s) sem instância WhatsApp vinculada
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
          const editavel = podeEditarPdv(pdv.id);

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
                vm.idPdvFiltro === pdv.id && "ring-2 ring-info/30",
              )}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-info/15 blur-2xl" />

              <div className="flex items-start justify-between gap-2">
                {emEdicao ? (
                  <div className="flex flex-1 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      disabled={salvando}
                      className="h-9"
                      placeholder="Nome do PDV"
                    />
                    <Select
                      value={instanciaEdicao || VALOR_SEM_INSTANCIA}
                      onValueChange={(valor) => setInstanciaEdicao(valor === VALOR_SEM_INSTANCIA ? "" : valor)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione uma instância WhatsApp" />
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
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg bg-success text-success-foreground hover:bg-success/90"
                        disabled={salvando}
                        onClick={() => void salvarEdicaoPdv()}
                      >
                        {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={salvando}
                        onClick={cancelarEdicaoPdv}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1"
                      onClick={() => handleCardClick(pdv.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(pdv.id); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground transition-colors duration-200">
                            {pdv.nome}
                          </h3>
                          {temColaboradores ? (
                            <p className="mt-1 text-xs text-foreground-muted">
                              {pdv.funcionarios?.length} colaborador(es)
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-foreground-disabled">Sem colaboradores</p>
                          )}
                        </div>
                        <Building2 className="h-4 w-4 shrink-0 text-foreground-disabled" />
                      </div>
                      {pdv.whatsapp_instancia ? (
                        <p className="mt-2 text-xs text-success">
                          WhatsApp: {pdv.whatsapp_instancia.nome}
                        </p>
                      ) : (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-2.5 py-2 text-xs text-warning">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{pdv.alerta_configuracao?.mensagem ?? "Sem instância WhatsApp vinculada."}</span>
                        </div>
                      )}
                    </div>

                    {editavel && (
                      <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          onClick={() => iniciarEdicaoPdv(pdv.id, pdv.nome, pdv.id_whatsapp_instancia)}
                          title="Editar PDV"
                          aria-label={`Editar PDV ${pdv.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {vm.podeGerenciarEmpresa && pdv.funcionarios?.length === 0 && (
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            onClick={() => vm.setPdvParaExcluir({ id: pdv.id, nome: pdv.nome })}
                            title="Excluir PDV"
                            aria-label={`Excluir PDV ${pdv.nome}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Dialog de exclusão de PDV */}
      <Dialog
        open={Boolean(vm.pdvParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) vm.setPdvParaExcluir(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir PDV</DialogTitle>
            <DialogDescription>Esta ação remove o PDV permanentemente. Não é possível desfazer.</DialogDescription>
          </DialogHeader>

          <p className="text-sm text-foreground-muted">
            Confirma a exclusão do PDV <span className="font-semibold">{vm.pdvParaExcluir?.nome}</span>?
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => vm.setPdvParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => void confirmarExclusaoPdv()}
              disabled={!vm.pdvParaExcluir || vm.excluindoPdvId === vm.pdvParaExcluir.id}
            >
              {vm.pdvParaExcluir && vm.excluindoPdvId === vm.pdvParaExcluir.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de criação de PDV */}
      <Sheet open={drawerNovoPdvAberto} onOpenChange={setDrawerNovoPdvAberto}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Novo PDV</SheetTitle>
            <SheetDescription>Crie um novo ponto de venda para distribuir equipe e operação.</SheetDescription>
          </SheetHeader>

          <form onSubmit={aoCriarPdv} className="mt-6 space-y-4 px-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do PDV</label>
              <Input
                name="nome"
                placeholder="Ex.: Centro Comercial"
                required
                value={nomeNovoPdv}
                onChange={(e) => setNomeNovoPdv(e.target.value)}
                disabled={vm.criandoPdv}
                className="h-10"
              />
            </div>

            <SheetFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                disabled={vm.criandoPdv || !nomeNovoPdv.trim()}
                className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
              >
                {vm.criandoPdv ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {vm.criandoPdv ? "Criando PDV..." : "Criar PDV"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={vm.criandoPdv}
                onClick={() => setDrawerNovoPdvAberto(false)}
              >
                Cancelar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
