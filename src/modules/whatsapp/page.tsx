"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, CheckCircle2, MessageCircle, TrendingUp, Activity, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { useWhatsappModule } from "./hooks/use-whatsapp-module";
import { useWhatsappAutomations } from "./hooks/use-whatsapp-automations";
import { useWhatsappJobs } from "./hooks/use-whatsapp-jobs";
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
          className="text-border"
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
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
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
    <ModulePageShell spacing="lg">
      <ModulePageHeader
        title="Centro de Comando de Vendas"
        subtitle="Gerencie suas conexões e fluxos de engajamento"
        iconTone="emerald"
        icon={
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        }
      />

      <InlineStatusAlert variant="error" message={vm.erro} className="animate-fade-in" />

      <InlineStatusAlert variant="success" message={sucesso} icon={<CheckCircle2 className="h-5 w-5" />} className="animate-fade-in" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-background-surface shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Wifi className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Saúde</p>
                <p className="text-2xl font-bold text-foreground">{connectedCount}</p>
                <p className="text-xs text-emerald-600">Instâncias Ativas</p>
              </div>
            </div>
            <Sparkline data={mockActivityData} />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-background-surface shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Volume</p>
                <p className="text-2xl font-bold text-foreground">{jobsVm.resumo.enviadosHoje}</p>
                <p className="text-xs text-blue-600">Mensagens Hoje</p>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border border-border bg-background-surface shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5" />
          <CardContent className="relative flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Eficiência</p>
                <p className="text-2xl font-bold text-foreground">{successRate}%</p>
                <p className="text-xs text-amber-600">Taxa de Sucesso</p>
              </div>
            </div>
            <MiniDonut value={successRate} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-background-surface shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Nova Conexão WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCriar}>
            <div className="relative flex-1">
              <Input
                className={`h-11 rounded-xl border-border bg-background-surface pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-emerald-400 focus:bg-background-surface focus:ring-2 transition-all ${
                  focused 
                    ? "ring-2 ring-emerald-500/20 border-emerald-400" 
                    : "ring-border/50"
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
          <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
          <p className="mt-3 text-sm text-foreground-muted">Carregando suas conexões...</p>
        </div>
      ) : (
        <InstanciasList
          instancias={vm.instancias}
          onExcluir={vm.excluirInstancia}
          onAtualizarStatus={vm.atualizarStatus}
          onReconectar={vm.reconectarInstancia}
          estaReconectando={vm.estaReconectando}
          getQrCode={vm.getQrCode}
          buscarQrCode={vm.buscarQrCode}
        />
      )}

      <div className="mt-2">
        <AutomacoesList
          automacoes={automacoesVm.automacoes}
          instancias={vm.instancias}
          carregando={automacoesVm.carregando}
          onCriar={automacoesVm.criarAutomacao}
          onAtualizar={automacoesVm.atualizarAutomacao}
          onDispararDispatch={automacoesVm.dispararDispatchFollowUp}
          onAlternar={automacoesVm.alternarAutomacao}
          onExcluir={automacoesVm.excluirAutomacao}
        />
      </div>
    </ModulePageShell>
  );
}
