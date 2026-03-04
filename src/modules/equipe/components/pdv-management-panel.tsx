"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseEquipeModuleReturn } from "../types";

type PdvManagementPanelProps = {
  vm: UseEquipeModuleReturn;
};

export function PdvManagementPanel({ vm }: PdvManagementPanelProps) {
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [instanciaEdicao, setInstanciaEdicao] = useState<string>("");

  const aoCriarPdv = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const nome = String(dados.get("nome") ?? "");
    await vm.criarPdv(nome);
    form.reset();
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

  if (vm.carregandoPdvs) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-6 text-sm text-slate-600">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando gestao de PDVs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vm.erroGestaoPdvs ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {vm.erroGestaoPdvs}
        </div>
      ) : null}

      <form onSubmit={aoCriarPdv} className="flex gap-2 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <Input
          name="nome"
          placeholder="Nome do novo PDV"
          required
          disabled={vm.criandoPdv}
          className="h-10"
        />
        <Button type="submit" disabled={vm.criandoPdv} className="rounded-xl bg-slate-800 text-white hover:bg-slate-700">
          {vm.criandoPdv ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar PDV"}
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {vm.pdvs.map((pdv) => {
          const emEdicao = vm.pdvEmEdicao?.id === pdv.id;
          const salvando = vm.salvandoPdvId === pdv.id;
          const excluindo = vm.excluindoPdvId === pdv.id;
          const temColaboradores = (pdv.funcionarios ?? []).length > 0;

          return (
            <article key={pdv.id} className="space-y-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between">
                {emEdicao ? (
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      value={nomeEdicao}
                      onChange={(evento) => setNomeEdicao(evento.target.value)}
                      disabled={salvando}
                      className="h-9"
                      placeholder="Nome do PDV"
                    />
                    <Select value={instanciaEdicao} onValueChange={setInstanciaEdicao}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione uma instância WhatsApp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
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
                        className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                        disabled={salvando}
                        onClick={() => void salvarEdicaoPdv()}
                      >
                        {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={salvando} onClick={cancelarEdicaoPdv}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{pdv.nome}</h3>
                      <p className="mt-1 text-xs text-slate-500">{temColaboradores ? `${pdv.funcionarios?.length} colaborador(es)` : "Sem colaboradores"}</p>
                      {pdv.whatsapp_instancia && (
                        <p className="mt-1 text-xs text-emerald-600">WhatsApp: {pdv.whatsapp_instancia.nome}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={excluindo}
                        onClick={() => iniciarEdicaoPdv(pdv.id, pdv.nome, pdv.id_whatsapp_instancia)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={excluindo || temColaboradores}
                        onClick={() => vm.setPdvParaExcluir({ id: pdv.id, nome: pdv.nome })}
                        title={temColaboradores ? "Nao e possivel excluir PDV com colaboradores vinculados" : "Excluir PDV"}
                      >
                        {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Users className="h-3 w-3" />
                  Colaboradores ativos
                </p>
                <ul className="space-y-1 text-sm text-slate-700">
                  {(pdv.funcionarios ?? []).length === 0 ? (
                    <li className="text-slate-500">Nenhum colaborador ativo neste PDV.</li>
                  ) : (
                    (pdv.funcionarios ?? []).map((funcionario) => (
                      <li key={funcionario.id}>
                        {funcionario.nome} - {funcionario.cargo}
                      </li>
                    ))
                  )}
                </ul>
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
            <DialogDescription>
              Esta acao remove o PDV permanentemente. Nao e possivel desfazer.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            Confirma a exclusao do PDV <span className="font-semibold">{vm.pdvParaExcluir?.nome}</span>?
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => vm.setPdvParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700"
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
    </div>
  );
}
