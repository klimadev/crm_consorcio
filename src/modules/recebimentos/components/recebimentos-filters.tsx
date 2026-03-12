import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseRecebimentosModuleReturn } from "../types";

type RecebimentosFiltersProps = {
  vm: UseRecebimentosModuleReturn;
};

export function RecebimentosFilters({ vm }: RecebimentosFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filtros operacionais</h2>
            <p className="text-xs text-slate-500">Refine o painel por periodo, origem da carteira e prioridade financeira.</p>
          </div>
        </div>

        {vm.temFiltrosAtivos ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={vm.limparFiltros}>
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Busca</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="rounded-xl pl-9" placeholder="Lead, telefone, responsavel ou PDV" value={vm.filtros.busca} onChange={(event) => vm.setBusca(event.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data inicial</label>
          <Input type="date" className="rounded-xl" value={vm.filtros.data_inicial} onChange={(event) => vm.setDataInicial(event.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data final</label>
          <Input type="date" className="rounded-xl" value={vm.filtros.data_final} onChange={(event) => vm.setDataFinal(event.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">PDV</label>
          <Select value={vm.filtros.id_pdv || "todos"} onValueChange={(value) => vm.setIdPdv(value === "todos" ? "" : value)}>
            <SelectTrigger className="rounded-xl">
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
          <label className="mb-1 block text-xs font-medium text-slate-600">Responsavel</label>
          <Select value={vm.filtros.id_funcionario || "todos"} onValueChange={(value) => vm.setIdFuncionario(value === "todos" ? "" : value)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Todos os responsaveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os responsaveis</SelectItem>
              {vm.opcoesResponsaveis.map((responsavel) => (
                <SelectItem key={responsavel.id} value={responsavel.id}>{responsavel.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Ordenar por</label>
          <Select value={vm.filtros.ordenar} onValueChange={(value) => vm.setOrdenar(value as typeof vm.filtros.ordenar)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vencimento">Vencimento</SelectItem>
              <SelectItem value="pagamento">Pagamento</SelectItem>
              <SelectItem value="valor">Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Direcao</label>
          <Select value={vm.filtros.direcao} onValueChange={(value) => vm.setDirecao(value as typeof vm.filtros.direcao)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Crescente</SelectItem>
              <SelectItem value="desc">Decrescente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700 xl:col-span-2">
          {vm.totalRegistros} registros encontrados nesta visao.
        </div>
      </div>
    </section>
  );
}
