"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Trash2, Smartphone, Clock, Wifi, WifiOff, QrCode, Loader2, Zap, AlertCircle } from "lucide-react";
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
  labelDetailed: string;
  className: string;
  icon: "connected" | "disconnected" | "qrcode" | "loading" | "error";
}

function getStatusBadge(status: string): StatusConfig {
  const statusLower = status?.toLowerCase() ?? "";
  
  if (statusLower === "connected" || statusLower === "open") {
    return {
      label: "Conectado",
      labelShort: "Online",
      labelDetailed: "Sincronizado e Pronto",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "connected",
    };
  }
  
  if (statusLower === "pending" || statusLower === "qrcode" || statusLower === "qr_code") {
    return {
      label: "Escaneie o QR Code",
      labelShort: "QR",
      labelDetailed: "Aguardando Conexão",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: "qrcode",
    };
  }
  
  if (statusLower === "loading" || statusLower === "creating") {
    return {
      label: "Carregando...",
      labelShort: "Carregando",
      labelDetailed: "Inicializando",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: "loading",
    };
  }
  
  if (statusLower === "disconnected" || statusLower === "close") {
    return {
      label: "Desconectado",
      labelShort: "Offline",
      labelDetailed: "Desconectado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: "disconnected",
    };
  }
  
  return {
    label: "Erro",
    labelShort: "Erro",
    labelDetailed: "Erro de Conexão",
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function calculateUptime(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "—";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
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

  const uptime = useMemo(() => {
    return calculateUptime(instancia.last_seen_at || null);
  }, [instancia.last_seen_at]);

  return (
    <OptimisticSync
      key={instancia.id}
      active={isTemporario}
      className="cursor-wait"
    >
      <Card className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-lg ${
        isConnected 
          ? "border-emerald-200/60 bg-zinc-900 shadow-lg shadow-emerald-900/10" 
          : "border-slate-200/60 bg-white hover:border-slate-300/60"
      }`}>
        <div className={`absolute left-0 top-0 h-1 w-full transition-colors ${
          isConnected 
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500" 
            : badge.icon === "qrcode"
              ? "bg-gradient-to-r from-amber-400 to-amber-500"
              : "bg-slate-200"
        }`} />
        
        <CardContent className={`p-5 pt-6 ${isConnected ? "bg-zinc-900" : ""}`}>
          <div className="flex items-start gap-4">
            <div className="relative">
              {instancia.profile_pic ? (
                <img
                  src={instancia.profile_pic}
                  alt="Foto de perfil"
                  className={`h-14 w-14 rounded-xl object-cover shadow-sm ${
                    isConnected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900" : ""
                  }`}
                />
              ) : (
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                  isConnected 
                    ? "bg-gradient-to-br from-emerald-900 to-emerald-800 text-emerald-400 ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900" 
                    : "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-600"
                }`}>
                  <span className="text-lg font-bold">{getInitials(instancia.profile_name || instancia.nome)}</span>
                </div>
              )}
              {isConnected && (
                <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </div>
              )}
              {!isConnected && (
                <div className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                  badge.icon === "qrcode" ? "bg-amber-500" : "bg-slate-300"
                }`}>
                  <StatusIcon status={instancia.status} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`truncate text-base font-semibold ${
                  isConnected ? "text-white" : "text-slate-800"
                }`}>
                  {instancia.profile_name || instancia.nome}
                </h3>
              </div>
              {instancia.phone && (
                <p className={`mt-0.5 truncate text-sm font-mono ${
                  isConnected ? "text-emerald-400/80" : "text-slate-500"
                }`}>
                  {instancia.phone}
                </p>
              )}
              {!instancia.phone && instancia.instance_name && (
                <p className={`mt-0.5 truncate text-xs ${
                  isConnected ? "text-zinc-500" : "text-slate-400"
                }`}>
                  {instancia.instance_name}
                </p>
              )}
              
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                    isConnected
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : badge.className
                  }`}
                >
                  <StatusIcon status={instancia.status} />
                  {isConnected ? "Sincronizado e Pronto" : badge.labelShort}
                </span>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="mt-4 flex items-center gap-4 rounded-lg bg-zinc-800/50 p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-zinc-400">
                  {instancia.latency_ms ? `${instancia.latency_ms}ms` : "—"}
                </span>
              </div>
              <div className="h-3 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-zinc-400">
                  {uptime}
                </span>
              </div>
              <div className="h-3 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  instancia.connection_quality === "excellent" || instancia.connection_quality === "good"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : instancia.connection_quality === "unstable"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-700 text-slate-400"
                }`}>
                  {instancia.connection_quality === "unknown" ? "Desconhecido" : instancia.connection_quality}
                </span>
              </div>
            </div>
          )}

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
              className={`flex-1 rounded-xl transition-all ${
                isConnected
                  ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
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
          <h3 className="text-lg font-semibold text-slate-800">Nenhuma conexão ativa</h3>
          <p className="mt-2 text-center text-sm text-slate-500 max-w-xs">
            Crie sua primeira instância WhatsApp para iniciar o cockpit.
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
