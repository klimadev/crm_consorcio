import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseRecebimentosModuleReturn } from "../types";

// Filtros avançados do Panorama. A busca rápida mora na barra da carteira;
// aqui ficam o corte de período e o escopo por equipe e responsável.
export function RecebimentosFilters({ vm }: { vm: UseRecebimentosModuleReturn }) {
  return (
    <section className="rounded-2xl border border-border bg-background-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Filtros avançados</h2>
          <p className="text-xs text-foreground-muted">Período, equipe e responsável. A busca rápida fica na carteira.</p>
        </div>

        {vm.temFiltrosAtivos ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={vm.limparFiltros}>
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="filtro-data-inicial-recebimentos" className="mb-1 block text-xs font-medium text-foreground-muted">Data inicial</label>
          <Input
            id="filtro-data-inicial-recebimentos"
            type="date"
            className="rounded-xl"
            value={vm.filtros.data_inicial}
            onChange={(event) => vm.setDataInicial(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="filtro-data-final-recebimentos" className="mb-1 block text-xs font-medium text-foreground-muted">Data final</label>
          <Input
            id="filtro-data-final-recebimentos"
            type="date"
            className="rounded-xl"
            value={vm.filtros.data_final}
            onChange={(event) => vm.setDataFinal(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="filtro-pdv-recebimentos" className="mb-1 block text-xs font-medium text-foreground-muted">PDV</label>
          <Select value={vm.filtros.id_pdv || "todos"} onValueChange={(value) => vm.setIdPdv(value === "todos" ? "" : value)}>
            <SelectTrigger id="filtro-pdv-recebimentos" className="rounded-xl">
              <SelectValue placeholder="Todos os PDVs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os PDVs</SelectItem>
              {vm.opcoesPdvs.map((pdv) => (
                <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="filtro-responsavel-recebimentos" className="mb-1 block text-xs font-medium text-foreground-muted">Responsável</label>
          <Select value={vm.filtros.id_funcionario || "todos"} onValueChange={(value) => vm.setIdFuncionario(value === "todos" ? "" : value)}>
            <SelectTrigger id="filtro-responsavel-recebimentos" className="rounded-xl">
              <SelectValue placeholder="Todos os responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os responsáveis</SelectItem>
              {vm.opcoesResponsaveis.map((responsavel) => (
                <SelectItem key={responsavel.id} value={responsavel.id}>{responsavel.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
