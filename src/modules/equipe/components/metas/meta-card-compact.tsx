import { cn } from "@/lib/utils";
import { formatarIndicadorMeta, formatarPeriodoMeta } from "./utils";
import type { MetaModuleItem } from "@/modules/equipe/types/metas";
import { Pencil, Trash2, Building2, User, Globe } from "lucide-react";
import type { TipoMeta } from "@/lib/tipos";

type MetaCardCompactProps = {
  meta: MetaModuleItem;
  podeEditar: boolean;
  desativando: boolean;
  onEditar: (meta: MetaModuleItem) => void;
  onDesativar: (id: string) => void;
  className?: string;
};

// Cores por status
function getStatusColor(percentual: number) {
  if (percentual >= 100) return "bg-emerald-500";
  if (percentual >= 70) return "bg-emerald-500";
  if (percentual >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function getStatusEmoji(percentual: number) {
  if (percentual >= 100) return "✅";
  if (percentual >= 70) return "🟢";
  if (percentual >= 50) return "🟡";
  return "🔴";
}

function getTipoIcon(tipo: TipoMeta | null | undefined) {
  switch (tipo) {
    case "GLOBAL":
      return <Globe className="h-3.5 w-3.5" />;
    case "PDV":
      return <Building2 className="h-3.5 w-3.5" />;
    case "INDIVIDUAL":
      return <User className="h-3.5 w-3.5" />;
    default:
      return <Globe className="h-3.5 w-3.5" />;
  }
}

export function MetaCardCompact({
  meta,
  podeEditar,
  desativando,
  onEditar,
  onDesativar,
  className,
}: MetaCardCompactProps) {
  const percentual = meta.progresso?.percentual ?? 0;
  const statusColor = getStatusColor(percentual);
  const statusEmoji = getStatusEmoji(percentual);
  const diasRestantes = meta.progresso?.dias_restantes ?? 0;

  // Formatar valores
  const valorRealizado = formatarIndicadorMeta(meta, meta.progresso?.realizado ?? 0);
  const valorMeta = formatarIndicadorMeta(meta, meta.alvo);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md",
        className
      )}
    >
      {/* Barra de progresso no topo */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-100">
        <div
          className={cn("h-full transition-all duration-500", statusColor)}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-start justify-between gap-4">
        {/* Lado esquerdo: Info principal */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Semáforo */}
            <span className="text-lg leading-none" title={`${percentual.toFixed(0)}% atingido`}>
              {statusEmoji}
            </span>
            
            {/* Tipo + Nome/PDV */}
            <div className="flex items-center gap-1.5 text-slate-500">
              {getTipoIcon(meta.tipo)}
              <span className="text-xs font-medium">
                {meta.tipo === "INDIVIDUAL" 
                  ? meta.funcionario?.nome ?? "Colaborador"
                  : meta.tipo === "PDV" 
                    ? meta.pdv?.nome ?? "PDV"
                    : "Meta Global"
                }
              </span>
            </div>
          </div>

          {/* Indicador + Período */}
          <p className="mt-2 text-sm font-semibold text-slate-900 truncate">
            {meta.tipo === "INDIVIDUAL" 
              ? formatarIndicadorMeta(meta, meta.alvo)
              : `${formatarIndicadorMeta(meta, meta.alvo)} • ${formatarPeriodoMeta(meta)}`
            }
          </p>
          
          {/* Indicador para não individuais */}
          {meta.tipo !== "INDIVIDUAL" && (
            <p className="mt-1 text-xs text-slate-500">
              {formatarIndicadorMeta(meta, meta.alvo)}
            </p>
          )}
        </div>

        {/* Lado direito: Números */}
        <div className="text-right">
          <p className={cn(
            "text-2xl font-bold tracking-tight",
            percentual >= 100 ? "text-emerald-600" :
            percentual >= 70 ? "text-emerald-600" :
            percentual >= 50 ? "text-amber-600" :
            "text-rose-600"
          )}>
            {percentual.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500">
            {valorRealizado} / {valorMeta}
          </p>
        </div>
      </div>

      {/* Linha inferior: Dias restantes + Ações */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3">
          {diasRestantes > 0 ? (
            <span className="text-xs text-slate-500">
              ⏰ {diasRestantes} dias restantes
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-600">
              ⚠️ Prazo encerrando
            </span>
          )}
        </div>

        {podeEditar && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEditar(meta)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDesativar(meta.id)}
              disabled={desativando}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Desativar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
