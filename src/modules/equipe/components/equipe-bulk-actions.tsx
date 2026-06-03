"use client";

import { useState } from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UseEquipeModuleReturn } from "../types";

type EquipeBulkActionsProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeBulkActions({ vm }: EquipeBulkActionsProps) {
  const [dialogConfirmacaoAberto, setDialogConfirmacaoAberto] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<{ acao: string; descricao: string } | null>(null);
  const [expandido, setExpandido] = useState(false);

  const acaoEDestrutiva = vm.acaoLote === "INATIVAR";
  const temSelecao = vm.idsSelecionados.length > 0;

  function handleExecutarAcao() {
    if (acaoEDestrutiva && vm.idsSelecionados.length > 0) {
      const count = vm.idsSelecionados.length;
      const textoAcao = count === 1
        ? "1 colaborador será inativado"
        : `${count} colaboradores serão inativados`;

      setAcaoPendente({ acao: "inativar", descricao: textoAcao });
      setDialogConfirmacaoAberto(true);
      return;
    }
    void vm.executarAcaoLote();
  }

  function confirmarAcao() {
    setDialogConfirmacaoAberto(false);
    setAcaoPendente(null);
    void vm.executarAcaoLote();
  }

  if (!vm.podeExecutarAcoesLote || !temSelecao) {
    return null;
  }

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-4 md:max-w-2xl lg:max-w-3xl">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300",
            expandido
              ? "border-info/30 bg-background-surface"
              : "border-border/60 bg-background-surface/95 backdrop-blur-sm",
          )}
        >
          {/* Barra compacta */}
          <div
            className="flex cursor-pointer items-center justify-between px-4 py-3"
            onClick={() => setExpandido(!expandido)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                <Check className="h-4 w-4 text-info" />
              </div>
              <p className="text-sm font-medium text-foreground">
                <span className="font-semibold text-info">{vm.idsSelecionados.length}</span> selecionados
              </p>
            </div>

            <div className="flex items-center gap-2">
              {expandido ? null : (
                <Button
                  size="sm"
                  className="rounded-lg bg-foreground font-medium text-background hover:bg-foreground/90"
                  onClick={(e) => { e.stopPropagation(); handleExecutarAcao(); }}
                  disabled={vm.executandoLote}
                >
                  {vm.executandoLote ? "..." : "Aplicar"}
                </Button>
              )}
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-disabled hover:bg-muted hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); vm.alternarSelecaoPagina(false); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Painel expandido */}
          <div
            className={cn(
              "border-t border-border/60 transition-all duration-300",
              expandido ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={vm.acaoLote}
                  onValueChange={(valor) => vm.setAcaoLote(valor as "ATIVAR" | "INATIVAR" | "ALTERAR_CARGO" | "ALTERAR_PDV")}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-sm font-medium sm:w-[180px]">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVAR">Ativar</SelectItem>
                    <SelectItem value="INATIVAR">Inativar</SelectItem>
                    <SelectItem value="ALTERAR_CARGO">Mudar cargo</SelectItem>
                    {vm.podeGerenciarEmpresa ? <SelectItem value="ALTERAR_PDV">Mudar PDV</SelectItem> : null}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="w-full rounded-xl bg-foreground font-medium text-background hover:bg-foreground/90 sm:w-auto"
                  onClick={handleExecutarAcao}
                  disabled={vm.executandoLote}
                >
                  {vm.executandoLote ? "Processando..." : "Aplicar"}
                </Button>
              </div>

              {vm.acaoLote === "ALTERAR_CARGO" ? (
                <Select value={vm.cargoLote} onValueChange={vm.setCargoLote}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-sm">
                    <SelectValue placeholder="Novo cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                    {vm.podeGerenciarEmpresa ? <SelectItem value="GERENTE">GERENTE</SelectItem> : null}
                    {vm.podeGerenciarEmpresa ? <SelectItem value="ADMINISTRADOR">ADMINISTRADOR</SelectItem> : null}
                  </SelectContent>
                </Select>
              ) : null}

              {vm.acaoLote === "ALTERAR_PDV" ? (
                <Select value={vm.pdvLote} onValueChange={vm.setPdvLote}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-sm">
                    <SelectValue placeholder="Novo PDV" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.pdvs.map((pdv) => (
                      <SelectItem key={pdv.id} value={pdv.id}>
                        {pdv.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              {vm.acaoLote === "INATIVAR" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={vm.destinoInativacaoLote} onValueChange={vm.setDestinoInativacaoLote}>
                    <SelectTrigger className="h-10 rounded-xl border-border bg-background text-sm">
                      <SelectValue placeholder="Destino para reatribuição" />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.funcionariosAtivosParaDestino.map((funcionario) => (
                        <SelectItem key={funcionario.id} value={funcionario.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{funcionario.nome}</span>
                            <span className="text-xs text-foreground-muted">
                              {funcionario.cargo} &bull; {funcionario.pdv?.nome}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    className="h-10 rounded-xl border-border bg-background"
                    placeholder="Observação (opcional)"
                    value={vm.observacaoLote}
                    onChange={(e) => vm.setObservacaoLote(e.target.value)}
                  />
                </div>
              ) : null}

              {vm.erroLote ? (
                <p className="text-sm font-medium text-destructive">{vm.erroLote}</p>
              ) : null}
              {vm.resultadoLote ? (
                <p className="text-sm text-foreground-muted">
                  Atualizados: {vm.resultadoLote.atualizados} de {vm.resultadoLote.processados}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <Dialog open={dialogConfirmacaoAberto} onOpenChange={(aberto) => { setDialogConfirmacaoAberto(aberto); if (!aberto) setAcaoPendente(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar ação em lote
            </DialogTitle>
            <DialogDescription>
              {acaoPendente?.descricao}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-foreground-muted">
              Os colaboradores selecionados serão inativados e seus dados serão reassignados ao destino selecionado.
              Esta ação pode ser desfeita manualmente posteriormente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConfirmacaoAberto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarAcao}>
              Confirmar inativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
