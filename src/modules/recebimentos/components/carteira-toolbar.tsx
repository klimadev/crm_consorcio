import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChipCarteira, UseRecebimentosModuleReturn } from "../types";

const LABELS_CHIPS: Record<ChipCarteira, string> = {
  em_atraso: "Em atraso",
  em_dia: "A vencer",
  todos: "Todos",
};

export function CarteiraToolbar({ vm }: { vm: UseRecebimentosModuleReturn }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filtrar carteira por estado do cliente</legend>
        {(Object.keys(LABELS_CHIPS) as ChipCarteira[]).map((chip) => {
          const ativo = vm.chip === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => vm.setChip(chip)}
              aria-pressed={ativo}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                ativo
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-background-surface text-foreground-muted hover:bg-muted hover:text-foreground",
              )}
            >
              {LABELS_CHIPS[chip]} ({vm.contadoresChips[chip]})
            </button>
          );
        })}
      </fieldset>

      <div className="relative w-full lg:w-80">
        <label htmlFor="busca-carteira" className="sr-only">Buscar cliente</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <Input
          id="busca-carteira"
          className="rounded-xl pl-9 pr-10"
          placeholder="Cliente, telefone, responsável ou PDV"
          value={vm.buscaDigitada}
          onChange={(event) => vm.setBusca(event.target.value)}
        />
        {vm.atualizando ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground-muted" />
        ) : null}
      </div>
    </div>
  );
}
