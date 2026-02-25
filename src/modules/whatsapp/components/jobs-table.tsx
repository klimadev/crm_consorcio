"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, TimerReset, AlertCircle, Send, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { WhatsappJobItem, WhatsappJobsResumo } from "../types";

type JobsTableProps = {
  resumo: WhatsappJobsResumo;
  jobs: WhatsappJobItem[];
  carregando: boolean;
  erro: string | null;
};

type ContextoLead = {
  lead_nome: string;
  lead_telefone: string;
  lead_id: string;
  estagio_anterior: string;
  estagio_novo: string;
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    PENDENTE: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
      icon: <Clock className="h-3 w-3" />,
    },
    PROCESSANDO: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-100",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    ENVIADO: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    FALHA: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
      icon: <XCircle className="h-3 w-3" />,
    },
    CANCELADO: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-100",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const c = config[status] || config.PENDENTE;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon}
      {status}
    </span>
  );
}

function CountdownTimer({ targetDate, status }: { targetDate: string; status: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "ENVIADO" || status === "CANCELADO" || status === "FALHA") return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const diff = useMemo(() => {
    const target = new Date(targetDate).getTime();
    const remaining = target - now;
    return remaining;
  }, [targetDate, now]);

  if (status === "ENVIADO") {
    return <span className="text-xs text-emerald-600">Enviado</span>;
  }

  if (status === "CANCELADO") {
    return <span className="text-xs text-slate-500">Cancelado</span>;
  }

  if (status === "FALHA") {
    return <span className="text-xs text-rose-600">Falhou</span>;
  }

  if (diff <= 0) {
    return (
      <span className="text-xs font-medium text-rose-600 animate-pulse">
        Agora!
      </span>
    );
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return (
      <span className="font-mono text-xs text-slate-600">
        <span className="text-slate-800 font-semibold">{hours}h</span>
        <span className="text-slate-400 mx-0.5">:</span>
        <span className="text-slate-800 font-semibold">{minutes.toString().padStart(2, "0")}m</span>
        <span className="text-slate-400 mx-0.5">:</span>
        <span className="text-slate-800 font-semibold">{seconds.toString().padStart(2, "0")}s</span>
      </span>
    );
  }

  if (minutes > 0) {
    return (
      <span className="font-mono text-xs text-amber-600 font-medium">
        {minutes}m {seconds}s
      </span>
    );
  }

  return (
    <span className="font-mono text-xs text-rose-600 font-medium animate-pulse">
      {seconds}s
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const isHoje = d.toDateString() === hoje.toDateString();
  const isAmanha = d.toDateString() === amanha.toDateString();

  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (isHoje) {
    return `Hoje, ${hora}`;
  }
  if (isAmanha) {
    return `Amanhã, ${hora}`;
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function truncate(str: string, len: number) {
  if (!str) return "-";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function getContextoLead(contextoJson: string): ContextoLead | null {
  try {
    return JSON.parse(contextoJson);
  } catch {
    return null;
  }
}

export function JobsTable({ resumo, jobs, carregando, erro }: JobsTableProps) {
  const jobsAgendados = resumo.pendentes + resumo.processando;

  if (carregando && jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Carregando jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
      {/* Header with summary */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
            <TimerReset className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{jobsAgendados}</p>
            <p className="text-xs text-slate-500">Jobs Agendados</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-amber-600">
            <Clock className="h-3.5 w-3.5" />
            Pend. <strong>{resumo.pendentes}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Proc. <strong>{resumo.processando}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Falhas <strong>{resumo.falhas}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600">
            <Send className="h-3.5 w-3.5" />
            Hoje <strong>{resumo.enviadosHoje}</strong>
          </span>
        </div>
      </div>

      {erro && (
        <div className="mx-4 mt-3 rounded-lg border border-rose-200/60 bg-rose-50/50 px-3 py-2">
          <p className="text-xs text-rose-600">{erro}</p>
        </div>
      )}

      {/* Table */}
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[100px]">Contagem</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead className="w-[180px]">Estágio</TableHead>
              <TableHead className="w-[200px]">Mensagem</TableHead>
              <TableHead className="w-[100px]">Agendado</TableHead>
              <TableHead className="w-[80px]">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <TimerReset className="h-8 w-8 text-slate-300" />
                    <p className="text-sm">Nenhum job encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const contexto = getContextoLead(job.contexto_json);
                return (
                  <TableRow key={job.id} className="group">
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>#{job.id.slice(0, 6)}</span>
                        {job.tentativas > 0 && (
                          <span className="text-amber-600" title={`${job.tentativas} tentativas`}>
                            ({job.tentativas})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 max-w-[150px]">
                          {contexto?.lead_nome || "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500 max-w-[150px]">
                          {contexto?.lead_telefone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contexto?.estagio_novo && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-600">{contexto.estagio_anterior}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="font-medium text-emerald-600">{contexto.estagio_novo}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="truncate text-xs text-slate-600 max-w-[180px]" title={job.mensagem_template}>
                        {truncate(job.mensagem_template, 40)}
                      </p>
                      {job.erro_ultimo && (
                        <p className="mt-0.5 truncate text-xs text-rose-600 max-w-[180px]" title={job.erro_ultimo}>
                          {truncate(job.erro_ultimo, 30)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(job.agendado_para)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CountdownTimer targetDate={job.agendado_para} status={job.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {jobs.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Mostrando <strong>{jobs.length}</strong> jobs
          </span>
          {resumo.falhas > 0 && (
            <span className="text-xs text-rose-600">
              {resumo.falhas} {resumo.falhas === 1 ? "job falhou" : "jobs falharam"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
