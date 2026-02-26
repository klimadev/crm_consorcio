"use client";

const VARIAVEIS = [
  "{{lead_nome}}",
  "{{lead_telefone}}",
  "{{lead_id}}",
  "{{estagio_anterior}}",
  "{{estagio_novo}}",
] as const;

interface VariableChipsProps {
  onSelect: (variavel: string) => void;
}

export function VariableChips({ onSelect }: VariableChipsProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Variáveis disponíveis</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {VARIAVEIS.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export const VARIAVEIS_DISPONIVEIS = VARIAVEIS;
