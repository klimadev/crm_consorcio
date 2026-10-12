import { CheckCircle2, CircleDollarSign } from "lucide-react";
import type { ChipCarteira } from "../types";

// Empty state por chip. Lista de atraso vazia é boa notícia: o tom comemora
// em vez de parecer erro.
const mensagens: Record<ChipCarteira, { titulo: string; descricao: string; positivo: boolean }> = {
  em_atraso: {
    titulo: "Nenhum cliente em atraso",
    descricao: "Ninguém está devendo agora. Se havia cobrança para hoje, ela já está feita.",
    positivo: true,
  },
  em_dia: {
    titulo: "Nenhum cliente a vencer neste filtro",
    descricao: "Ajuste o período ou aguarde novos vencimentos na carteira.",
    positivo: false,
  },
  todos: {
    titulo: "Ainda não há clientes com parcelas para acompanhar",
    descricao: "Assim que os planos de pagamento forem gerados, a carteira aparece aqui.",
    positivo: false,
  },
};

export function RecebimentosEmptyState({ chip }: { chip: ChipCarteira }) {
  const conteudo = mensagens[chip];

  return (
    <section
      className={
        conteudo.positivo
          ? "rounded-2xl border border-success/25 bg-success/5 px-6 py-12 text-center shadow-sm"
          : "rounded-2xl border border-dashed border-border bg-background-surface px-6 py-12 text-center shadow-sm"
      }
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        {conteudo.positivo ? (
          <CheckCircle2 className="h-7 w-7 text-success" />
        ) : (
          <CircleDollarSign className="h-7 w-7 text-foreground-muted" />
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{conteudo.titulo}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground-muted">{conteudo.descricao}</p>
    </section>
  );
}
