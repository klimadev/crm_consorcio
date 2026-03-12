import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formataMoeda } from "@/lib/utils";

type ItemStatus = {
  status: "PAGO" | "PENDENTE" | "ATRASADO";
  quantidade: number;
  valor: number;
};

const cores = {
  PAGO: "#10b981",
  PENDENTE: "#3b82f6",
  ATRASADO: "#f43f5e",
};

const labels = {
  PAGO: "Recebido",
  PENDENTE: "A vencer",
  ATRASADO: "Atrasado",
};

type RecebimentosStatusDonutProps = {
  dados: ItemStatus[];
};

export function RecebimentosStatusDonut({ dados }: RecebimentosStatusDonutProps) {
  const total = dados.reduce((acc, item) => acc + item.quantidade, 0) || 1;
  const segmentos = dados.reduce<Array<ItemStatus & { dash: string; offset: number }>>((acc, item) => {
    const percentual = item.quantidade / total;
    const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset - Number(acc[acc.length - 1].dash.split(" ")[0]);
    acc.push({
      ...item,
      dash: `${percentual * 226} ${226}`,
      offset,
    });
    return acc;
  }, []);

  return (
    <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-800">Distribuicao por status</CardTitle>
        <p className="text-sm text-slate-500">Veja rapidamente onde estao os gargalos e a tracao dos recebimentos.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="mx-auto flex h-44 w-44 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="36" fill="none" stroke="#e2e8f0" strokeWidth="12" />
            {segmentos.map((item) => (
              <circle
                key={item.status}
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke={cores[item.status]}
                strokeWidth="12"
                strokeDasharray={item.dash}
                strokeDashoffset={item.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Parcelas</p>
            <p className="text-3xl font-bold text-slate-900">{dados.reduce((acc, item) => acc + item.quantidade, 0)}</p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {dados.map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cores[item.status] }} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{labels[item.status]}</p>
                  <p className="text-xs text-slate-500">{item.quantidade} parcelas</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700">{formataMoeda(item.valor)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
