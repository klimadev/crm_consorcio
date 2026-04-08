import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formataMoeda } from "@/lib/utils";

export function ResumoAtendentesRanking({ dados }: { dados: Array<{ nome: string; email: string; quantidadeNegocios: number; ticketMedio: number; valorTotal: number }> }) {
  return (
    <Card className="rounded-[1.5rem] border-border bg-background-surface shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Atendentes com mais negocios</CardTitle>
        <p className="text-sm text-foreground-muted">Ranking operacional do periodo.</p>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[320px] overflow-y-auto">
        {dados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background-elevated px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum ranking disponivel</p>
            <p className="text-xs text-foreground-muted">Aguardando negocios no periodo.</p>
          </div>
        ) : (
          dados.map((item, index) => (
            <div key={item.email} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-elevated px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{index + 1}. {item.nome}</p>
                <p className="text-xs text-foreground-muted">{item.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{item.quantidadeNegocios} negocios</p>
                <p className="text-xs text-foreground-muted">Ticket {formataMoeda(item.ticketMedio)} | Total {formataMoeda(item.valorTotal)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
