import type { ReactNode } from "react";

type EmptyStateProps = {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
};

export function EmptyState({ icone, titulo, descricao, acao, className }: EmptyStateProps) {
  return (
    <div className={className ?? "flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-slate-500"}>
      {icone ? <div className="text-emerald-600">{icone}</div> : null}
      <div>
        <p className="text-sm font-semibold text-slate-700">{titulo}</p>
        {descricao ? <p className="mt-1 text-xs">{descricao}</p> : null}
      </div>
      {acao ?? null}
    </div>
  );
}
