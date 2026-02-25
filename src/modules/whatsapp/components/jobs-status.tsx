import { Loader2, TimerReset, AlertCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { WhatsappJobsResumo } from "../types";

type JobsStatusProps = {
  resumo: WhatsappJobsResumo;
  carregando: boolean;
  erro: string | null;
};

export function JobsStatus({ resumo, carregando, erro }: JobsStatusProps) {
  const jobsAgendados = resumo.pendentes + resumo.processando;

  return (
    <Card className="rounded-xl border border-slate-200/60 bg-white">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
          {carregando ? (
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
          ) : (
            <TimerReset className="h-5 w-5 text-cyan-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-slate-800">{jobsAgendados}</p>
          <p className="text-xs text-slate-500">Jobs Agendados</p>
          {erro ? (
            <p className="mt-1 truncate text-[11px] text-rose-600">{erro}</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Loader2 className={`h-3 w-3 ${resumo.processando > 0 ? "animate-spin" : ""}`} />
                Proc. {resumo.processando}
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Falhas {resumo.falhas}
              </span>
              <span className="inline-flex items-center gap-1">
                <Send className="h-3 w-3" />
                Hoje {resumo.enviadosHoje}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
