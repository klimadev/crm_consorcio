import type { ReactNode } from "react";
import { Users, Inbox } from "lucide-react";

type EmptyStateProps = {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
  variant?: "default" | "leads";
};

export function EmptyState({ icone, titulo, descricao, acao, className, variant = "default" }: EmptyStateProps) {
  // Ícones padrão quando não há icone personalizado
  const defaultIcon = variant === "leads" ? (
    <svg className="w-20 h-20 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ) : (
    <Inbox className="h-16 w-16 text-slate-200" />
  );

  return (
    <div className={className ?? "flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50/50 px-6 py-12 text-center"}>
      {icone ? (
        <div className="text-emerald-600">{icone}</div>
      ) : (
        <div className="mb-2">{defaultIcon}</div>
      )}
      <div>
        <p className="text-base font-semibold text-slate-700">{titulo}</p>
        {descricao ? <p className="mt-1 text-sm text-slate-500">{descricao}</p> : null}
      </div>
      {acao ?? null}
    </div>
  );
}
