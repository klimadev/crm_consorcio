"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, CheckCircle2, Zap, MessageCircle, TrendingUp, Activity, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWhatsappModule } from "./hooks/use-whatsapp-module";
import { useWhatsappAutomations } from "./hooks/use-whatsapp-automations";
import { useWhatsappJobs } from "./hooks/use-whatsapp-jobs";
import { WhatsappHeader } from "./components/whatsapp-header";
import { InstanciasList } from "./components/instances-list";
import { AutomacoesList } from "./components/automacoes-list";
import { JobsTable } from "./components/jobs-table";

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 50" className="h-8 w-16 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#sparkGrad)"
        className="text-emerald-500"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500"
      />
    </svg>
  );
}

function MiniDonut({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative h-10 w-10">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-200"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
        {value}%
      </span>
    </div>
  );
}

export function ModuloWhatsapp() {
  const vm = useWhatsappModule();
  const automacoesVm = useWhatsappAutomations();
  const jobsVm = useWhatsappJobs();
  const [nomeInstancia, setNomeInstancia] = useState("");
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeInstancia.trim()) return;
    
    setSucesso(null);
    await vm.criarInstancia(nomeInstancia.trim());
    setNomeInstancia("");
    setSucesso("Instância criada! Escaneie o QR Code com seu WhatsApp.");
    
    setTimeout(() => setSucesso(null), 5000);
  };

  const connectedCount = vm.instancias.filter(
    (i) => i.status === "connected" || i.status === "open"
  ).length;

  const successRate = jobsVm.resumo.enviadosHoje + jobsVm.resumo.falhas > 0
    ? Math.round((jobsVm.resumo.enviadosHoje / (jobsVm.resumo.enviadosHoje + jobsVm.resumo.falhas)) * 100)
    : 100;

  const mockActivityData = [20, 35, 25, 45, 30, 55, 40, 60, 35, 50, 45, 70];

  return (
    <section className="space-y-6 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <WhatsappHeader />

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Wifi className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Saúde</p>
                <p className="text-2xl font-bold text-slate-800">{connectedCount}</p>
                <p className="text-xs text-emerald-600">Instâncias Ativas</p>
              </div>
            </div>
            <Sparkline data={mockActivityData} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Volume</p>
                <p className="text-2xl font-bold text-slate-800">{jobsVm.resumo.enviadosHoje}</p>
                <p className="text-xs text-blue-600">Mensagens Hoje</p>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Eficiência</p>
                <p className="text-2xl font-bold text-slate-800">{successRate}%</p>
                <p className="text-xs text-amber-600">Taxa de Sucesso</p>
              </div>
            </div>
            <MiniDonut value={successRate} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Nova Conexão WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3" onSubmit={handleCriar}>
            <div className="relative flex-1">
              <Input
                className={`h-11 rounded-xl border-slate-200 bg-slate-50/80 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 transition-all ${
                  focused 
                    ? "ring-2 ring-emerald-500/20 border-emerald-400" 
                    : "ring-slate-200/50"
                }`}
                placeholder="Ex: WhatsApp Vendas, Suporte..."
                value={nomeInstancia}
                onChange={(e) => setNomeInstancia(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                minLength={3}
              />
            </div>
            <Button 
              className="rounded-xl bg-emerald-600 font-medium text-white hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={!nomeInstancia.trim() || vm.carregando}
            >
              {vm.carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Instanciar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <JobsTable
        resumo={jobsVm.resumo}
        jobs={jobsVm.jobs}
        carregando={jobsVm.carregando}
        erro={jobsVm.erro}
      />

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
