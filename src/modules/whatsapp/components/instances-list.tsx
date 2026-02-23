"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Trash2, Smartphone, Clock } from "lucide-react";
import type { WhatsappInstancia } from "../types";

type Props = {
  instancias: WhatsappInstancia[];
  onExcluir: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string) => Promise<void>;
  getQrCode: (id: string) => string | null;
  buscarQrCode: (id: string) => Promise<string | null>;
};

function getStatusBadge(status: string) {
  const statusLower = status?.toLowerCase() ?? "";
  
  if (statusLower === "connected" || statusLower === "open") {
    return {
      label: "Conectado",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  
  if (statusLower === "pending" || statusLower === "qrcode" || statusLower === "qr_code") {
    return {
      label: "Escaneie o QR Code",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500 animate-pulse",
    };
  }
  
  if (statusLower === "loading") {
    return {
      label: "Carregando...",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500 animate-pulse",
    };
  }
  
  if (statusLower === "creating") {
    return {
      label: "Criando...",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500 animate-pulse",
    };
  }
  
  if (statusLower === "disconnected" || statusLower === "close") {
    return {
      label: "Desconectado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    };
  }
  
  if (statusLower === "failed" || statusLower === "error") {
    return {
      label: "Erro",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  }
  
  return {
    label: "Pendente",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };
}

function QrCodeDisplay({ 
  qrCode, 
  phone, 
  instanciaId, 
  buscarQrCode 
}: { 
  qrCode: string | null; 
  phone: string | null;
  instanciaId: string;
  buscarQrCode: (id: string) => Promise<string | null>;
}) {
  const [tempoRestante, setTempoRestante] = useState(60);
  const [estaExpirado, setEstaExpirado] = useState(false);
  const [qrAtual, setQrAtual] = useState(qrCode);
  const [carregandoQr, setCarregandoQr] = useState(false);

  useEffect(() => {
    setQrAtual(qrCode);
  }, [qrCode]);

  useEffect(() => {
    if (phone) return;

    setTempoRestante(60);
    setEstaExpirado(false);

    const intervalo = setInterval(() => {
      setTempoRestante((antigo: number) => {
        if (antigo <= 1) {
          setEstaExpirado(true);
          return 0;
        }
        return antigo - 1;
      });
    }, 1000);

    return () => clearInterval(intervalo);
  }, [phone, qrAtual]);

  useEffect(() => {
    if (phone || qrAtual || !instanciaId || instanciaId.startsWith("temp-")) return;

    const carregarQr = async () => {
      setCarregandoQr(true);
      const novoQr = await buscarQrCode(instanciaId);
      if (novoQr) {
        setQrAtual(novoQr);
      }
      setCarregandoQr(false);
    };

    carregarQr();
  }, [instanciaId, phone]);

  if (phone) return null;

  const percentual = (tempoRestante / 60) * 100;
  const corBarra = tempoRestante > 20 ? "bg-emerald-500" : tempoRestante > 10 ? "bg-amber-500" : "bg-rose-500";

  if (!qrAtual && !carregandoQr) return null;

  if (carregandoQr) {
    return (
      <div className="mt-4 flex flex-col items-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-5">
        <div className="h-64 w-64 animate-pulse rounded-xl bg-slate-200" />
        <p className="mt-4 text-sm text-slate-500">Carregando QR Code...</p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </div>
      <p className="mb-4 text-sm font-semibold text-amber-800">
        Escaneie o QR Code com seu WhatsApp
      </p>
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {qrAtual?.startsWith("http") ? (
          <img src={qrAtual} alt="QR Code" className="h-64 w-64" />
        ) : (
          <img src={qrAtual ?? ""} alt="QR Code" className="h-64 w-64" />
        )}
      </div>

      <div className="mt-4 w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1 text-slate-600">
            <Clock className="h-3.5 w-3.5" />
            {estaExpirado ? "Expirado" : `${tempoRestante}s`}
          </span>
          <span className={estaExpirado ? "text-rose-600" : "text-slate-500"}>
            {estaExpirado ? "QR Code expirou" : "Tempo restante"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${corBarra}`}
            style={{ width: `${percentual}%` }}
          />
        </div>
        {estaExpirado && (
          <p className="text-center text-xs font-medium text-rose-600">
            Clique em &quot;Atualizar&quot; para gerar um novo QR Code
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-amber-600">
        WhatsApp → Configurações → Aparelhos conectados → Conectar ap.
      </p>
    </div>
  );
}

export function InstanciasList({ instancias, onExcluir, onAtualizarStatus, getQrCode, buscarQrCode }: Props) {
  if (instancias.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Smartphone className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Nenhuma conexão</h3>
          <p className="mt-1 text-center text-sm text-slate-500">
            Crie sua primeira instância WhatsApp para começar a usar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {instancias.map((instancia) => {
        const isTemporario = instancia.id.startsWith("temp-");
        const badge = getStatusBadge(instancia.status);

        return (
          <OptimisticSync
            key={instancia.id}
            active={isTemporario}
            className="cursor-wait"
          >
            <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {instancia.profile_pic ? (
                    <img
                      src={instancia.profile_pic}
                      alt="Foto de perfil"
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Smartphone className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-800">
                      {instancia.profile_name || instancia.nome}
                    </h3>
                    {instancia.phone && (
                      <p className="truncate text-sm text-slate-500">
                        {instancia.phone}
                      </p>
                    )}
                    {instancia.instance_name && !instancia.phone && (
                      <p className="truncate text-xs text-slate-400">
                        {instancia.instance_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${badge.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>

                <QrCodeDisplay 
                  qrCode={getQrCode(instancia.id)} 
                  phone={instancia.phone} 
                  instanciaId={instancia.id}
                  buscarQrCode={buscarQrCode}
                />

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                    disabled={isTemporario}
                    onClick={() => onAtualizarStatus(instancia.id)}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                    disabled={isTemporario}
                    onClick={() => onExcluir(instancia.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </OptimisticSync>
        );
      })}
    </div>
  );
}
