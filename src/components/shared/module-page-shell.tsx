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
        "min-w-0",
        spacing === "md" ? "space-y-5" : "space-y-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
