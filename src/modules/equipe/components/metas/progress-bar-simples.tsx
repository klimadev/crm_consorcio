import { cn } from "@/lib/utils";
import { formataMoeda } from "@/lib/utils";
import { Trophy, Flame, Target, Zap, Frown } from "lucide-react";

type ProgressBarSimplesProps = {
  percentual: number;
  realizado: number;
  meta: number;
  tipoMeta: "VALOR" | "VOLUME";
  faltante?: number;
  diasRestantes?: number;
  className?: string;
};

// Status visual based on percentage
function getStatusInfo(percentual: number) {
  if (percentual >= 100) {
    return {
      label: "Meta batida! 🎉",
      emoji: Trophy,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
    };
  }
  if (percentual >= 80) {
    return {
      label: "Quase lá! 🔥",
      emoji: Flame,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
    };
  }
  if (percentual >= 50) {
    return {
      label: "No caminho! 🎯",
      emoji: Target,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  if (percentual >= 25) {
    return {
      label: "Começando bem! ⚡",
      emoji: Zap,
      color: "bg-slate-400",
      textColor: "text-slate-600",
      bgColor: "bg-slate-50",
    };
  }
  return {
    label: "Bora começar! 💪",
    emoji: Frown,
    color: "bg-slate-300",
    textColor: "text-slate-500",
    bgColor: "bg-slate-50",
  };
}

// Format value based on type
function formatValor(valor: number, tipo: "VALOR" | "VOLUME") {
  if (tipo === "VALOR") {
    return formataMoeda(valor);
  }
  return `${valor} contratos`;
}

export function ProgressBarSimples({
  percentual,
  realizado,
  meta,
  tipoMeta,
  faltante,
  diasRestantes,
  className,
}: ProgressBarSimplesProps) {
  const valorLimitado = Math.max(0, Math.min(percentual, 100));
  const status = getStatusInfo(percentual);
  const StatusIcon = status.emoji;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Badge */}
      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2", status.bgColor)}>
        <StatusIcon className={cn("h-4 w-4", status.textColor)} />
        <span className={cn("text-sm font-medium", status.textColor)}>{status.label}</span>
        {diasRestantes !== undefined && diasRestantes > 0 && (
          <span className="ml-auto text-xs text-slate-500">{diasRestantes} dias restantes</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative h-6 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", status.color)}
          style={{ width: `${valorLimitado}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-700">
            {percentual.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-slate-500">Realizado: </span>
          <span className="font-semibold text-slate-900">{formatValor(realizado, tipoMeta)}</span>
        </div>
        <div>
          <span className="text-slate-500">Meta: </span>
          <span className="font-semibold text-slate-900">{formatValor(meta, tipoMeta)}</span>
        </div>
      </div>

      {/* Missing amount (if applicable) */}
      {faltante !== undefined && faltante > 0 && percentual < 100 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <span className="font-medium">Falta {formatValor(faltante, tipoMeta)}</span>
          <span className="text-amber-600"> para atingir a meta!</span>
        </div>
      )}

      {/* Celebration when goal is reached */}
      {percentual >= 100 && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span className="font-medium">Parabéns! 🎉</span>
          <span className="text-emerald-600"> Meta atingida com sucesso!</span>
        </div>
      )}
    </div>
  );
}
