"use client";

import { useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  valor: string;
  onChange: (valor: string) => void;
};

export function ChatSearch({ valor, onChange }: Props) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const novoValor = e.target.value;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onChange(novoValor), 300);
    },
    [onChange],
  );

  const limpar = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Buscar conversas..."
        defaultValue={valor}
        onChange={handleChange}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900",
          "placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100",
        )}
      />
      {valor && (
        <button
          type="button"
          onClick={limpar}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
