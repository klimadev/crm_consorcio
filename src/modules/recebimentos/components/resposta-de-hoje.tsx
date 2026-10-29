import { CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formataMoeda } from "@/lib/utils";

type RespostaDeHojeProps = {
  carregando: boolean;
  clientesEmAtraso: number;
  totalAtrasado: number;
  vencendo7Dias: number;
  onIniciar: () => void;
};

export function RespostaDeHoje({ carregando, clientesEmAtraso, totalAtrasado, vencendo7Dias, onIniciar }: RespostaDeHojeProps) {
  if (carregando) {
    return <div className="h-32 rounded-2xl border border-border bg-background-elevated animate-shimmer" />;
  }

  const hojePorExtenso = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date());

  if (clientesEmAtraso === 0) {
    return (
      <section className="rounded-2xl border border-success/25 bg-success/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </span>
            <div>
              <p className="text-sm text-foreground-muted">Hoje, {hojePorExtenso}</p>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Nenhum cliente em atraso. Operação em dia.</h2>
            </div>
          </div>
          <p className="text-sm text-foreground-muted">
            {vencendo7Dias > 0
              ? `${vencendo7Dias} parcelas vencem nos próximos 7 dias.`
              : "Nada vence nos próximos 7 dias. Bom trabalho."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15">
            <Users className="h-6 w-6 text-destructive" />
          </span>
          <div>
            <p className="text-sm text-foreground-muted">Hoje, {hojePorExtenso}</p>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {clientesEmAtraso} {clientesEmAtraso === 1 ? "cliente para cobrar" : "clientes para cobrar"}
              <span className="text-destructive"> · {formataMoeda(totalAtrasado)}</span>
            </h2>
            <p className="text-sm text-foreground-muted">
              {vencendo7Dias > 0
                ? `${vencendo7Dias} parcelas vencem nos próximos 7 dias.`
                : "Nenhuma parcela vence nos próximos 7 dias."}
            </p>
          </div>
        </div>
        <Button type="button" className="min-h-11 rounded-xl" onClick={onIniciar}>
          Iniciar cobranças
        </Button>
      </div>
    </section>
  );
}
