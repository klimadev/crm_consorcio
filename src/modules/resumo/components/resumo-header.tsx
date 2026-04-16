import { BarChart3 } from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FiltroPeriodoResumo } from "../types";

const opcoesPeriodo: Array<{ valor: FiltroPeriodoResumo; rotulo: string }> = [
  { valor: "todo", rotulo: "Todo periodo" },
  { valor: "mensal", rotulo: "Mensal" },
  { valor: "semanal", rotulo: "Semanal" },
];

export function ResumoHeader({ periodoSelecionado, onPeriodoChange }: { periodoSelecionado: FiltroPeriodoResumo; onPeriodoChange: (periodo: FiltroPeriodoResumo) => void }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <ModulePageHeader title="Resumo" subtitle="Panorama do funil, da equipe e dos gargalos operacionais." icon={<BarChart3 className="h-6 w-6" />} iconTone="emerald" />
      <div className="w-full rounded-2xl border border-border bg-background-elevated/90 p-3 shadow-sm lg:w-64">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">Periodo global</p>
        <Select value={periodoSelecionado} onValueChange={(valor) => onPeriodoChange(valor as FiltroPeriodoResumo)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Selecione o periodo" />
          </SelectTrigger>
          <SelectContent>
            {opcoesPeriodo.map((opcao) => (
              <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
