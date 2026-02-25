"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Trash2, Smartphone, Clock, Wifi, WifiOff, QrCode, Loader2 } from "lucide-react";
import type { WhatsappInstancia } from "../types";

type Props = {
  instancias: WhatsappInstancia[];
  onExcluir: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string) => Promise<void>;
  getQrCode: (id: string) => string | null;
  buscarQrCode: (id: string) => Promise<string | null>;
};

interface StatusConfig {
  label: string;
  labelShort: string;
  className: string;
  icon: "connected" | "disconnected" | "qrcode" | "loading" | "error";
}

function getStatusBadge(status: string): StatusConfig {
  const statusLower = status?.toLowerCase() ?? "";
  
  if (statusLower === "connected" || statusLower === "open") {
    return {
      label: "Conectado",
      labelShort: "Online",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "connected",
    };
  }
  
  if (statusLower === "pending" || statusLower === "qrcode" || statusLower === "qr_code") {
    return {
      label: "Escaneie o QR Code",
      labelShort: "QR",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: "qrcode",
    };
  }
  
  if (statusLower === "loading" || statusLower === "creating") {
    return {
      label: "Carregando...",
      labelShort: "Carregando",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: "loading",
    };
  }
  
  if (statusLower === "disconnected" || statusLower === "close") {
    return {
      label: "Desconectado",
      labelShort: "Offline",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: "disconnected",
    };
  }
  
  return {
    label: "Erro",
    labelShort: "Erro",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: "error",
  };
}

function StatusIcon({ status }: { status: string }) {
  const config = getStatusBadge(status);
  
  const iconClasses = {
    connected: "text-emerald-500",
    disconnected: "text-slate-400",
    qrcode: "text-amber-500 animate-pulse",
    loading: "text-blue-500 animate-pulse",
    error: "text-rose-500",
  };

  const icons = {
    connected: <Wifi className="h-4 w-4" />,
    disconnected: <WifiOff className="h-4 w-4" />,
    qrcode: <QrCode className="h-4 w-4" />,
    loading: <Loader2 className="h-4 w-4 animate-spin" />,
    error: <WifiOff className="h-4 w-4" />,
  };

  return <span className={iconClasses[config.icon]}>{icons[config.icon]}</span>;
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
        <QrCode className="h-5 w-5 text-amber-600" />
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

function InstanceCard({ 
  instancia, 
  onExcluir, 
  onAtualizarStatus, 
  getQrCode, 
  buscarQrCode 
}: { 
  instancia: WhatsappInstancia;
  onExcluir: (id: string) => Promise<void>;
  onAtualizarStatus: (id: string) => Promise<void>;
  getQrCode: (id: string) => string | null;
  buscarQrCode: (id: string) => Promise<string | null>;
}) {
  const isTemporario = instancia.id.startsWith("temp-");
  const badge = getStatusBadge(instancia.status);
  const isConnected = badge.icon === "connected";

  return (
    <OptimisticSync
      key={instancia.id}
      active={isTemporario}
      className="cursor-wait"
    >
      <Card className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-lg hover:border-slate-300/60">
        {/* Status indicator line */}
        <div className={`absolute left-0 top-0 h-1 w-full transition-colors ${
          isConnected 
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500" 
            : badge.icon === "qrcode"
              ? "bg-gradient-to-r from-amber-400 to-amber-500"
              : "bg-slate-200"
        }`} />
        
        <CardContent className="p-5 pt-6">
          <div className="flex items-start gap-4">
            {/* Avatar with status */}
            <div className="relative">
              {instancia.profile_pic ? (
                <img
                  src={instancia.profile_pic}
                  alt="Foto de perfil"
                  className="h-14 w-14 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600 shadow-sm">
                  <Smartphone className="h-7 w-7" />
                </div>
              )}
              {/* Status dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                isConnected 
                  ? "bg-emerald-500" 
                  : badge.icon === "qrcode"
                    ? "bg-amber-500"
                    : "bg-slate-300"
              }`}>
                <StatusIcon status={instancia.status} />
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-800">
                  {instancia.profile_name || instancia.nome}
                </h3>
              </div>
              {instancia.phone && (
                <p className="mt-0.5 truncate text-sm text-slate-500 font-mono">
                  {instancia.phone}
                </p>
              )}
              {!instancia.phone && instancia.instance_name && (
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {instancia.instance_name}
                </p>
              )}
              
              {/* Status badge */}
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${badge.className}`}
                >
                  <StatusIcon status={instancia.status} />
                  {badge.labelShort}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code section */}
          <QrCodeDisplay 
            qrCode={getQrCode(instancia.id)} 
            phone={instancia.phone} 
            instanciaId={instancia.id}
            buscarQrCode={buscarQrCode}
          />

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              disabled={isTemporario}
              onClick={() => onAtualizarStatus(instancia.id)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all"
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
}

export function InstanciasList({ instancias, onExcluir, onAtualizarStatus, getQrCode, buscarQrCode }: Props) {
  if (instancias.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
            <Smartphone className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Nenhuma conexão</h3>
          <p className="mt-2 text-center text-sm text-slate-500 max-w-xs">
            Crie sua primeira instância WhatsApp para começar a usar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {instancias.map((instancia) => (
        <InstanceCard
          key={instancia.id}
          instancia={instancia}
          onExcluir={onExcluir}
          onAtualizarStatus={onAtualizarStatus}
          getQrCode={getQrCode}
          buscarQrCode={buscarQrCode}
        />
      ))}
    </div>
  );
}
