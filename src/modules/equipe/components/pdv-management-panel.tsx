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
  const [instanciaEmEdicaoId, setInstanciaEmEdicaoId] = useState<string | null>(null);
  const [nomeInstanciaEdicao, setNomeInstanciaEdicao] = useState("");
  const [instanciaParaExcluir, setInstanciaParaExcluir] = useState<{ id: string; nome: string } | null>(null);

  const aoCriarPdv = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const nome = String(dados.get("nome") ?? "");
    await vm.criarPdv(nome);
    form.reset();
  };

  const aoCriarInstancia = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const nome = String(dados.get("nome_instancia") ?? "");
    await vm.criarInstanciaWhatsapp(nome);
    form.reset();
  };

  const iniciarEdicaoInstancia = (id: string, nome: string) => {
    setInstanciaEmEdicaoId(id);
    setNomeInstanciaEdicao(nome);
  };

  const cancelarEdicaoInstancia = () => {
    setInstanciaEmEdicaoId(null);
    setNomeInstanciaEdicao("");
  };

  const confirmarExclusaoInstancia = async () => {
    if (!instanciaParaExcluir) {
      return;
    }

    await vm.excluirInstanciaWhatsapp(instanciaParaExcluir.id);
    setInstanciaParaExcluir(null);
  };

  const salvarEdicaoInstancia = async () => {
    if (!instanciaEmEdicaoId) {
      return;
    }

    const ok = await vm.salvarInstanciaWhatsapp(instanciaEmEdicaoId, nomeInstanciaEdicao);
    if (ok) {
      cancelarEdicaoInstancia();
    }
  };

  if (vm.carregandoPdvs || vm.carregandoInstanciasWhatsapp) {
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

      <form onSubmit={aoCriarInstancia} className="flex gap-2 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <Input
          name="nome_instancia"
          placeholder="Nome da nova instancia WhatsApp"
          required
          minLength={3}
          disabled={vm.criandoInstanciaWhatsapp}
          className="h-10"
        />
        <Button type="submit" disabled={vm.criandoInstanciaWhatsapp} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
          {vm.criandoInstanciaWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar instancia"}
        </Button>
      </form>

      <div className="space-y-2 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instancias WhatsApp</p>
        {vm.instanciasWhatsapp.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma instancia cadastrada.</p>
        ) : (
          vm.instanciasWhatsapp.map((instancia) => {
            const emEdicao = instanciaEmEdicaoId === instancia.id;
            const salvando = vm.salvandoInstanciaWhatsappId === instancia.id;
            const excluindo = vm.excluindoInstanciaWhatsappId === instancia.id;

            return (
              <div key={instancia.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                {emEdicao ? (
                  <Input
                    value={nomeInstanciaEdicao}
                    onChange={(evento) => setNomeInstanciaEdicao(evento.target.value)}
                    disabled={salvando}
                    className="h-9 flex-1"
                  />
                ) : (
                  <div className="flex min-w-[180px] flex-1 flex-col">
                    <span className="text-sm font-medium text-slate-800">{instancia.nome}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{instancia.status}</span>
                  </div>
                )}

                {emEdicao ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                      disabled={salvando}
                      onClick={() => void salvarEdicaoInstancia()}
                    >
                      {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={salvando} onClick={cancelarEdicaoInstancia}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={excluindo}
                      onClick={() => iniciarEdicaoInstancia(instancia.id, instancia.nome)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50"
                      disabled={excluindo}
                      onClick={() => setInstanciaParaExcluir({ id: instancia.id, nome: instancia.nome })}
                    >
                      {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={Boolean(instanciaParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setInstanciaParaExcluir(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir instancia WhatsApp</DialogTitle>
            <DialogDescription>
              Essa acao remove a instancia permanentemente e desvincula automaticamente os PDVs que a utilizam.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            Confirma a exclusao da instancia <span className="font-semibold">{instanciaParaExcluir?.nome}</span>?
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInstanciaParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => void confirmarExclusaoInstancia()}
              disabled={!instanciaParaExcluir || vm.excluindoInstanciaWhatsappId === instanciaParaExcluir.id}
            >
              {instanciaParaExcluir && vm.excluindoInstanciaWhatsappId === instanciaParaExcluir.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2">
        {vm.pdvs.map((pdv) => {
          const salvando = vm.salvandoInstanciaPdvId === pdv.id;
          return (
            <article key={pdv.id} className="space-y-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{pdv.nome}</h3>
                <p className="mt-1 text-xs text-slate-500">Instancia WhatsApp padrao</p>
              </div>

              <Select
                value={pdv.id_whatsapp_instancia ?? "none"}
                onValueChange={(valor) => void vm.atualizarInstanciaPadraoPdv(pdv.id, valor === "none" ? null : valor)}
                disabled={salvando}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instancia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem instancia</SelectItem>
                  {vm.instanciasWhatsapp.map((instancia) => (
                    <SelectItem key={instancia.id} value={instancia.id}>
                      {instancia.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {salvando ? (
                <p className="flex items-center text-xs text-slate-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Salvando instancia...
                </p>
              ) : null}

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
    </div>
  );
}
