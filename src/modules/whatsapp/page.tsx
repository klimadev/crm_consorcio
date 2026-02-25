"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, CheckCircle2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWhatsappModule } from "./hooks/use-whatsapp-module";
import { useWhatsappAutomations } from "./hooks/use-whatsapp-automations";
import { useWhatsappJobs } from "./hooks/use-whatsapp-jobs";
import { WhatsappHeader } from "./components/whatsapp-header";
import { InstanciasList } from "./components/instances-list";
import { AutomacoesList } from "./components/automacoes-list";
import { JobsTable } from "./components/jobs-table";

export function ModuloWhatsapp() {
  const vm = useWhatsappModule();
  const automacoesVm = useWhatsappAutomations();
  const jobsVm = useWhatsappJobs();
  const [nomeInstancia, setNomeInstancia] = useState("");
  const [sucesso, setSucesso] = useState<string | null>(null);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeInstancia.trim()) return;
    
    setSucesso(null);
    await vm.criarInstancia(nomeInstancia.trim());
    setNomeInstancia("");
    setSucesso("Instância criada! Escaneie o QR Code com seu WhatsApp.");
    
    setTimeout(() => setSucesso(null), 5000);
  };

  // Calculate connected instances count
  const connectedCount = vm.instancias.filter(
    (i) => i.status === "connected" || i.status === "open"
  ).length;

  return (
    <section className="space-y-6 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <WhatsappHeader />

      {/* Feedback Messages */}
      {vm.erro && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm animate-fade-in">
          <p className="text-sm font-medium text-rose-700">{vm.erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">{sucesso}</p>
        </div>
      )}

      {/* Instance Creation Card */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Nova Conexão WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3" onSubmit={handleCriar}>
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              placeholder="Ex: WhatsApp Vendas, Suporte..."
              value={nomeInstancia}
              onChange={(e) => setNomeInstancia(e.target.value)}
              required
              minLength={3}
            />
            <Button 
              className="rounded-xl bg-emerald-600 font-medium text-white hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={!nomeInstancia.trim() || vm.carregando}
            >
              {vm.carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-xl border border-slate-200/60 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{connectedCount}</p>
              <p className="text-xs text-slate-500">Conectadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/60 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{automacoesVm.automacoes.length}</p>
              <p className="text-xs text-slate-500">Automações</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-slate-200/60 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{vm.instancias.length}</p>
              <p className="text-xs text-slate-500">Total Instâncias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <JobsTable
        resumo={jobsVm.resumo}
        jobs={jobsVm.jobs}
        carregando={jobsVm.carregando}
        erro={jobsVm.erro}
      />

      {/* Instances List */}
      {vm.carregando ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Carregando suas conexões...</p>
        </div>
      ) : (
        <InstanciasList
          instancias={vm.instancias}
          onExcluir={vm.excluirInstancia}
          onAtualizarStatus={vm.atualizarStatus}
          getQrCode={vm.getQrCode}
          buscarQrCode={vm.buscarQrCode}
        />
      )}

      {/* Automations Section */}
      <div className="mt-2">
        <AutomacoesList
          automacoes={automacoesVm.automacoes}
          instancias={vm.instancias}
          carregando={automacoesVm.carregando}
          erro={automacoesVm.erro}
          onCriar={automacoesVm.criarAutomacao}
          onAtualizar={automacoesVm.atualizarAutomacao}
          onPreview={automacoesVm.previewMensagem}
          onDispararDispatch={automacoesVm.dispararDispatchFollowUp}
          onAlternar={automacoesVm.alternarAutomacao}
          onExcluir={automacoesVm.excluirAutomacao}
        />
      </div>
    </section>
  );
}
