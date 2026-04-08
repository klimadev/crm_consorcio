import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formataMoeda } from "@/lib/utils";

export function ResumoAtendentesDonut({ dados }: { dados: Array<{ nome: string; quantidade: number; percentual: number; valor: number }> }) {
  const total = dados.reduce((acc, item) => acc + item.quantidade, 0) || 1;
  const cores = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e"];
  const segmentos = dados.reduce<Array<{ nome: string; quantidade: number; percentual: number; valor: number; cor: string; dash: number; offset: number }>>((acc, item, index) => {
    const dash = (item.quantidade / total) * 226;
    const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset - acc[acc.length - 1].dash;
    acc.push({ ...item, cor: cores[index % cores.length], dash, offset });
    return acc;
  }, []);

  return (
    <Card className="rounded-[1.5rem] border-border bg-background-surface shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Participacao por atendente</CardTitle>
        <p className="text-sm text-foreground-muted">Leitura rapida da distribuicao do volume no periodo.</p>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {dados.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background-elevated px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum dado no periodo</p>
            <p className="text-xs text-foreground-muted">Volte mais tarde para ver a distribuicao.</p>
          </div>
        ) : (
          <div className="relative flex h-[200px] sm:h-[240px] lg:h-[260px] w-full items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute h-full w-full max-w-[200px] -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="14" />
              {segmentos.map((item) => (
                <circle
                  key={item.nome}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.cor}
                  strokeWidth="14"
                  strokeDasharray={`${item.dash} 251`}
                  strokeDashoffset={item.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="z-10 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">Total</p>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{dados.reduce((acc, item) => acc + item.quantidade, 0)}</p>
              <p className="text-[10px] text-foreground-disabled">{dados.length} atendentes</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
