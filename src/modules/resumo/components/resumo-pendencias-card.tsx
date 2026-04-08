import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResumoPendenciasCard({ pendencias }: { pendencias: { total: number; criticas: number; alertas: number; leadsImpactados: number; itens: Array<{ tipo: string; quantidade: number; descricao: string }> } }) {
  return (
    <Card className="rounded-[1.5rem] border-border bg-background-surface shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Pendencias e gargalos</CardTitle>
        <p className="text-sm text-foreground-muted">O que exige acao agora.</p>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[320px] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-rose-50 p-3">
            <p className="text-xs font-medium text-rose-700">Criticas</p>
            <p className="text-2xl font-semibold text-rose-950">{pendencias.criticas}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-700">Alertas</p>
            <p className="text-2xl font-semibold text-amber-950">{pendencias.alertas}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background-elevated px-3 py-2 text-sm text-foreground-muted">
          {pendencias.leadsImpactados} leads impactados | {pendencias.total} pendencias
        </div>
        <div className="space-y-2">
          {pendencias.itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background-elevated px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Tudo clean!</p>
              <p className="text-xs text-foreground-muted">Nenhuma pendencia no momento.</p>
            </div>
          ) : pendencias.itens.map((item) => (
            <div key={item.tipo} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-elevated px-3 py-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-foreground-muted" />
                <span className="text-sm text-foreground">{item.descricao}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.quantidade}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
