import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ModulePageShellProps = {
  children: ReactNode;
  spacing?: "md" | "lg";
  className?: string;
};

export function ModulePageShell({ children, spacing = "md", className }: ModulePageShellProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-slate-50/50 p-4 md:p-6",
        spacing === "md" ? "space-y-5 pb-6" : "space-y-6 pb-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
