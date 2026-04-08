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
  slate: { wrap: "bg-background-elevated", icon: "text-foreground-muted" },
  emerald: { wrap: "bg-success/15", icon: "text-success" },
  blue: { wrap: "bg-info/15", icon: "text-info" },
  amber: { wrap: "bg-warning/15", icon: "text-warning" },
  rose: { wrap: "bg-destructive/15", icon: "text-destructive" },
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
    <header className={cn("flex flex-col gap-4 py-1 md:flex-row md:items-start md:justify-between", className)}>
      <div className="flex items-center gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60", tone.wrap)}>
          <span className={cn(tone.icon)}>{icon}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">{title}</h1>
          {subtitle ? <p className="text-sm text-foreground-muted">{subtitle}</p> : null}
          {badges?.length ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3 md:justify-end">{actions}</div> : null}
      {children}
    </header>
  );
}
