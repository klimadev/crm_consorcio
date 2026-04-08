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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
      <input
        type="text"
        placeholder="Buscar conversas..."
        defaultValue={valor}
        onChange={handleChange}
        aria-label="Buscar conversas"
        className={cn("w-full rounded-xl py-2.5 pl-10 pr-9 text-sm", "placeholder:text-foreground-muted")}
      />
      {valor && (
        <button
          type="button"
          onClick={limpar}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
