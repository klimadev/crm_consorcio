"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, TimerReset, AlertCircle, Send, CheckCircle2, XCircle, Clock, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
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

type FilterType = "todos" | "pendentes" | "processando" | "enviados" | "falhas";

function FilterPill({ 
  active, 
  onClick, 
  icon, 
  label, 
  count 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-slate-800 text-white"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
      <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs ${
        active ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"
      }`}>
        {count}
      </span>
    </button>
  );
}

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
      bg: "bg-gradient-to-r from-emerald-50 to-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
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

function ErrorTooltip({ 
  erroCodigo, 
  erroCategoria, 
  erroDetalhe, 
  erroOriginal, 
  acaoRecomendada 
}: { 
  erroCodigo: string | null; 
  erroCategoria: string | null; 
  erroDetalhe: string | null; 
  erroOriginal: string | null;
  acaoRecomendada: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!erroOriginal) return null;

  return (
    <div className="mt-0.5">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-rose-600 hover:underline"
      >
        <AlertCircle className="h-3 w-3" />
        Erro: Ver motivo
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-left">
          <div className="space-y-1">
            <p className="font-semibold text-rose-700">
              Erro: {erroCodigo || "Desconhecido"}
            </p>
            {erroCategoria && (
              <p className="text-xs text-rose-600">Categoria: {erroCategoria}</p>
            )}
            <p className="text-xs text-slate-600">{erroDetalhe || erroOriginal}</p>
            {acaoRecomendada && (
              <p className="text-xs font-medium text-emerald-600 pt-1 border-t border-rose-200 mt-1">
                {acaoRecomendada}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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
  const [filter, setFilter] = useState<FilterType>("todos");
  
  const filteredJobs = useMemo(() => {
    if (filter === "todos") return jobs;
    if (filter === "pendentes") return jobs.filter(j => j.status === "PENDENTE");
    if (filter === "processando") return jobs.filter(j => j.status === "PROCESSANDO");
    if (filter === "enviados") return jobs.filter(j => j.status === "ENVIADO");
    if (filter === "falhas") return jobs.filter(j => j.status === "FALHA");
    return jobs;
  }, [jobs, filter]);

  const filterCounts = useMemo(() => ({
    todos: jobs.length,
    pendentes: jobs.filter(j => j.status === "PENDENTE").length,
    processando: jobs.filter(j => j.status === "PROCESSANDO").length,
    enviados: jobs.filter(j => j.status === "ENVIADO").length,
    falhas: jobs.filter(j => j.status === "FALHA").length,
  }), [jobs]);

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
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
            <TimerReset className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">Fila de Envios em Tempo Real</p>
            <p className="text-xs text-slate-500">{resumo.pendentes + resumo.processando} jobs agendados</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <FilterPill 
            active={filter === "todos"} 
            onClick={() => setFilter("todos")}
            icon={<TimerReset className="h-3 w-3" />}
            label="Todos"
            count={filterCounts.todos}
          />
          <FilterPill 
            active={filter === "falhas"} 
            onClick={() => setFilter("falhas")}
            icon={<AlertCircle className="h-3 w-3" />}
            label="Falhas"
            count={filterCounts.falhas}
          />
          <FilterPill 
            active={filter === "pendentes"} 
            onClick={() => setFilter("pendentes")}
            icon={<Clock className="h-3 w-3" />}
            label="Pendentes"
            count={filterCounts.pendentes}
          />
          <FilterPill 
            active={filter === "processando"} 
            onClick={() => setFilter("processando")}
            icon={<Loader2 className="h-3 w-3" />}
            label="Processando"
            count={filterCounts.processando}
          />
          <FilterPill 
            active={filter === "enviados"} 
            onClick={() => setFilter("enviados")}
            icon={<Send className="h-3 w-3" />}
            label="Enviados"
            count={filterCounts.enviados}
          />
        </div>
      </div>

      {erro && (
        <div className="mx-4 mt-3 rounded-lg border border-rose-200/60 bg-rose-50/50 px-3 py-2">
          <p className="text-xs text-rose-600">{erro}</p>
        </div>
      )}

      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead className="w-[180px]">Estágio</TableHead>
              <TableHead className="w-[200px]">Mensagem</TableHead>
              <TableHead className="w-[100px]">Agendado</TableHead>
              <TableHead className="w-[80px]">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <TimerReset className="h-8 w-8 text-slate-300" />
                    <p className="text-sm">Nenhum job encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => {
                const contexto = getContextoLead(job.contexto_json);
                const isProcessing = job.status === "PROCESSANDO";
                
                return (
                  <TableRow key={job.id} className="group relative">
                    {isProcessing && job.progress_pct !== null && (
                      <div 
                        className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${job.progress_pct}%` }}
                      />
                    )}
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
                      <ErrorTooltip 
                        erroCodigo={job.erro_codigo}
                        erroCategoria={job.erro_categoria}
                        erroDetalhe={job.erro_detalhe}
                        erroOriginal={job.erro_ultimo}
                        acaoRecomendada={job.acao_recomendada}
                      />
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

      {filteredJobs.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Mostrando <strong>{filteredJobs.length}</strong> de <strong>{jobs.length}</strong> jobs
          </span>
          {filterCounts.falhas > 0 && filter !== "falhas" && (
            <button 
              onClick={() => setFilter("falhas")}
              className="text-xs text-rose-600 hover:underline"
            >
              {filterCounts.falhas} {filterCounts.falhas === 1 ? "job falhou" : "jobs falharam"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
