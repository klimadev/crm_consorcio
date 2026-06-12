"use client";

import { cn } from "@/lib/utils";
import type { PeriodoDisponivel, ProporcaoItem, ResumoMetas } from "@/modules/metas/types";
import { PeriodFilter } from "@/modules/metas/components/period-filter";
import { TeamProportion } from "@/modules/metas/components/team-proportion";

type Props = {
  resumo: ResumoMetas;
  opcoesEquipes: Array<{ id: string; nome: string }>;
  equipeSelecionada: string | null;
  onEquipeChange: (id: string | null) => void;
  perfil: string;
  mesReferencia: string;
  periodosDisponiveis: PeriodoDisponivel[];
  onMesChange: (mes: string) => void;
  comparacaoAtiva: boolean;
  onComparacaoToggle: (ativa: boolean) => void;
  mesComparacao: string;
  onMesComparacaoChange: (mes: string) => void;
  proporcaoEquipes: ProporcaoItem[];
};

export function MetasHeader({
  resumo,
  opcoesEquipes,
  equipeSelecionada,
  onEquipeChange,
  perfil,
  mesReferencia,
  periodosDisponiveis,
  onMesChange,
  comparacaoAtiva,
  onComparacaoToggle,
  mesComparacao,
  onMesComparacaoChange,
  proporcaoEquipes,
}: Props) {
  const mediaExibida = `${resumo.media_percentual.toFixed(0)}%`;

  return (
    <div className="space-y-4">
      {/* Linha 1: Título + Seletor equipe + Filtro período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Metas</h2>
          <p className="text-sm text-foreground-muted">
            Acompanhe o desempenho semanal das equipes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de equipe */}
          {perfil === "EMPRESA" && opcoesEquipes.length > 1 && (
            <select
              value={equipeSelecionada ?? "__all__"}
              onChange={(e) => onEquipeChange(e.target.value === "__all__" ? null : e.target.value)}
              className="h-9 rounded-xl border border-border bg-background-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="__all__">Todas as equipes</option>
              {opcoesEquipes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome}
                </option>
              ))}
            </select>
          )}

          {perfil === "GERENTE" && equipeSelecionada && (
            <div className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
              {opcoesEquipes.find((e) => e.id === equipeSelecionada)?.nome ?? "Minha equipe"}
            </div>
          )}

          {/* Filtro de período + comparação */}
          <PeriodFilter
            mesReferencia={mesReferencia}
            periodosDisponiveis={periodosDisponiveis}
            onMesChange={onMesChange}
            comparacaoAtiva={comparacaoAtiva}
            onComparacaoToggle={onComparacaoToggle}
            mesComparacao={mesComparacao}
            onMesComparacaoChange={onMesComparacaoChange}
          />
        </div>
      </div>

      {/* Métricas de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Equipes"
          value={String(resumo.total_equipes)}
          subtitle="no período"
        />
        <MetricCard
          label="No ritmo"
          value={String(resumo.no_ritmo)}
          subtitle="≥80%"
          className="border-success/30 text-success"
        />
        <MetricCard
          label="Atenção"
          value={String(resumo.atencao)}
          subtitle="≥45%"
          className="border-warning/30 text-warning"
        />
        <MetricCard
          label="Média geral"
          value={mediaExibida}
          subtitle="entre equipes"
          className="border-info/30 text-info"
        />
      </div>

      {/* Barra de proporção (só quando "Todas as equipes") */}
      {!equipeSelecionada && proporcaoEquipes.length > 0 && (
        <TeamProportion proporcao={proporcaoEquipes} />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  className,
}: {
  label: string;
  value: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background-surface p-3 transition-colors",
        className,
      )}
    >
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", className)}>{value}</p>
      <p className="mt-0.5 text-xs text-foreground-muted">{subtitle}</p>
    </div>
  );
}
