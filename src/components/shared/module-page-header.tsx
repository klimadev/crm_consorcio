import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "slate" | "emerald" | "blue" | "amber" | "rose";

type ModulePageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconTone?: Tone;
  badges?: ReactNode[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const toneStyles: Record<Tone, { wrap: string; icon: string }> = {
  slate: { wrap: "bg-gradient-to-br from-slate-100 to-slate-200", icon: "text-slate-600" },
  emerald: { wrap: "bg-gradient-to-br from-emerald-500 to-emerald-600", icon: "text-white" },
  blue: { wrap: "bg-gradient-to-br from-blue-500 to-blue-600", icon: "text-white" },
  amber: { wrap: "bg-gradient-to-br from-amber-500 to-amber-600", icon: "text-white" },
  rose: { wrap: "bg-gradient-to-br from-rose-500 to-rose-600", icon: "text-white" },
};

export function ModulePageHeader({
  title,
  subtitle,
  icon,
  iconTone = "slate",
  badges,
  actions,
  children,
  className,
}: ModulePageHeaderProps) {
  const tone = toneStyles[iconTone];

  return (
    <header className={cn("flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tone.wrap)}>
          <span className={cn(tone.icon)}>{icon}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 md:text-2xl">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          {badges?.length ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      {children}
    </header>
  );
}
