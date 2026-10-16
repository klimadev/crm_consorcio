import { BarChart3, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formataData } from "@/lib/utils";
import type { ChipCarteira, UseRecebimentosModuleReturn } from "../types";

const LABELS_CHIPS: Record<ChipCarteira, string> = {
  em_atraso: "Em atraso",
  em_dia: "A vencer",
  todos: "Todos",
};

type CarteiraToolbarProps = {
  vm: UseRecebimentosModuleReturn;
  onAbrirPanorama: () => void;
};

// A carteira nunca mente sobre o que está sendo mostrado: recortes ativos
// (período, PDV, responsável, busca) viram chips visíveis e removíveis.
export function CarteiraToolbar({ vm, onAbrirPanorama }: CarteiraToolbarProps) {
  const recortes: Array<{ chave: string; rotulo: string; limpar: () => void }> = [];

  if (vm.filtros.data_inicial || vm.filtros.data_final) {
    const inicio = vm.filtros.data_inicial ? formataData(vm.filtros.data_inicial) : null;
    const fim = vm.filtros.data_final ? formataData(vm.filtros.data_final) : null;
    recortes.push({
      chave: "periodo",
      rotulo: inicio && fim ? `${inicio} a ${fim}` : inicio ? `Desde ${inicio}` : `Até ${fim}`,
      limpar: () => {
        vm.setDataInicial("");
        vm.setDataFinal("");
      },
    });
  }
  if (vm.filtros.id_pdv) {
    const pdv = vm.opcoesPdvs.find((opcao) => opcao.id === vm.filtros.id_pdv);
    recortes.push({ chave: "pdv", rotulo: pdv?.nome ?? "PDV", limpar: () => vm.setIdPdv("") });
  }
  if (vm.filtros.id_funcionario) {
    const responsavel = vm.opcoesResponsaveis.find((opcao) => opcao.id === vm.filtros.id_funcionario);
    recortes.push({ chave: "responsavel", rotulo: responsavel?.nome ?? "Responsável", limpar: () => vm.setIdFuncionario("") });
  }
  if (vm.filtros.busca) {
    recortes.push({ chave: "busca", rotulo: `Busca: ${vm.filtros.busca}`, limpar: () => vm.setBusca("") });
  }

  return (
    <div className="space-y-3">
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

        <div className="flex w-full items-center gap-2 lg:w-auto">
          <div className="relative flex-1 lg:w-72">
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
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0 rounded-xl"
            onClick={onAbrirPanorama}
            aria-haspopup="dialog"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Panorama
          </Button>
        </div>
      </div>

      {recortes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-foreground-muted">Recorte aplicado:</span>
          {recortes.map((recorte) => (
            <span
              key={recorte.chave}
              className="flex min-h-9 items-center gap-1 rounded-full border border-info/30 bg-info/10 py-1 pl-3 pr-1 text-xs font-medium text-info"
            >
              {recorte.rotulo}
              <button
                type="button"
                onClick={recorte.limpar}
                className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-info/20"
                aria-label={`Remover filtro ${recorte.rotulo}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={vm.limparFiltros}
            className="text-xs text-foreground-muted underline underline-offset-2 transition-colors hover:text-foreground"
          >
            limpar tudo
          </button>
        </div>
      ) : null}
    </div>
  );
}
