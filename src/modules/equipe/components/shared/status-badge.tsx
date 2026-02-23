import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  ativo: boolean;
};

export function StatusBadge({ ativo }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        ativo
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-slate-100 text-slate-600 border border-slate-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ativo ? "bg-emerald-500" : "bg-slate-400")} />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
