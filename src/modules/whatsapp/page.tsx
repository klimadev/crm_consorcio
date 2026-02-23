"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWhatsappModule } from "./hooks/use-whatsapp-module";
import { WhatsappHeader } from "./components/whatsapp-header";
import { InstanciasList } from "./components/instances-list";

export function ModuloWhatsapp() {
  const vm = useWhatsappModule();
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

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <WhatsappHeader />

      {vm.erro && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{vm.erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">{sucesso}</p>
        </div>
      )}

      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Criar nova conexão</h2>
          <form className="flex gap-3" onSubmit={handleCriar}>
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              placeholder="Nome para identificar esta conexão"
              value={nomeInstancia}
              onChange={(e) => setNomeInstancia(e.target.value)}
              required
              minLength={3}
            />
            <Button 
              className="rounded-xl bg-emerald-600 font-medium text-white hover:bg-emerald-700"
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
          <p className="mt-2 text-xs text-slate-500">
            Ex: &quot;WhatsApp Principal&quot;, &quot;Vendas&quot;, &quot;Suporte&quot;
          </p>
        </CardContent>
      </Card>

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
    </section>
  );
}
