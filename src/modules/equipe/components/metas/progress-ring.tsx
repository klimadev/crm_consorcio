import { cn } from "@/lib/utils";

type ProgressRingProps = {
  percentual: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  legenda?: string;
  showColor?: boolean;
};

// Cores dinâmicas baseadas no percentual
function getProgressColor(percentual: number): string {
  if (percentual >= 100) return "#10b981"; // emerald-500
  if (percentual >= 70) return "#10b981";  // emerald-500
  if (percentual >= 50) return "#f59e0b";  // amber-500
  return "#f43f5e";                        // rose-500
}

function getProgressBgColor(percentual: number): string {
  if (percentual >= 70) return "rgba(16, 185, 129, 0.15)";
  if (percentual >= 50) return "rgba(245, 158, 11, 0.15)";
  return "rgba(244, 63, 94, 0.15)";
}

export function ProgressRing({ percentual, size = 140, strokeWidth = 12, className, legenda, showColor = true }: ProgressRingProps) {
  const valorLimitado = Math.max(0, Math.min(percentual, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (valorLimitado / 100) * circumference;
  
  const strokeColor = showColor ? getProgressColor(percentual) : "#10b981";
  const bgColor = showColor ? getProgressBgColor(percentual) : "rgba(148, 163, 184, 0.18)";

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-2xl font-bold tracking-[-0.02em]" style={{ color: strokeColor }}>
          {percentual.toFixed(0)}%
        </p>
        {legenda ? <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{legenda}</p> : null}
      </div>
    </div>
  );
}
