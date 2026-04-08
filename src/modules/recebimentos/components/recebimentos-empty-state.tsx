import { CircleDollarSign } from "lucide-react";

type RecebimentosEmptyStateProps = {
  aba: "todos" | "recebidos" | "a_vencer" | "atrasados";
};

const mensagens = {
  todos: {
    titulo: "Ainda nao ha recebimentos para acompanhar",
    descricao: "Assim que as parcelas forem geradas e comecarem a ser pagas, este painel passa a mostrar a operacao completa.",
  },
  recebidos: {
    titulo: "Nenhum pagamento encontrado neste filtro",
    descricao: "Ajuste o periodo ou aguarde novas baixas para acompanhar a entrada real do caixa.",
  },
  a_vencer: {
    titulo: "Nenhuma parcela futura nesta visao",
    descricao: "Neste recorte atual nao existem parcelas pendentes com vencimento pela frente.",
  },
  atrasados: {
    titulo: "Nenhuma parcela atrasada agora",
    descricao: "Excelente sinal: nao ha recebimentos vencidos dentro deste filtro no momento.",
  },
};

export function RecebimentosEmptyState({ aba }: RecebimentosEmptyStateProps) {
  const conteudo = mensagens[aba];

  return (
    <section className="rounded-2xl border border-dashed border-border bg-background-surface px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <CircleDollarSign className="h-7 w-7 text-foreground-muted" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{conteudo.titulo}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-foreground-muted">{conteudo.descricao}</p>
    </section>
  );
}
