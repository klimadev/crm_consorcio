import type { StatusParcela } from "@/lib/api/parcelas";

// Vocabulário único da feature financeira. O banco e a API seguem usando os
// códigos de máquina (AGUARDANDO, ABORTADA, PONTUAL, SUBSEQUENTES...); toda
// string visível ao usuário sai daqui. Nenhuma tela escreve rótulo de status
// ou de modo de cancelamento à mão: use este módulo.

export type TomStatus = "default" | "success" | "warning" | "error" | "info";

export type RotuloStatus = {
  rotulo: string;
  tom: TomStatus;
  classeBadge: string;
  cor: string;
  descricao: string;
};

export const ROTULOS_STATUS: Record<StatusParcela, RotuloStatus> = {
  AGUARDANDO: {
    rotulo: "A vencer",
    tom: "info",
    classeBadge: "border-info/25 bg-info/10 text-info",
    cor: "var(--info)",
    descricao: "vencimento pela frente",
  },
  ATRASADA: {
    rotulo: "Em atraso",
    tom: "error",
    classeBadge: "border-destructive/25 bg-destructive/10 text-destructive",
    cor: "var(--destructive)",
    descricao: "passou do vencimento",
  },
  PAGA: {
    rotulo: "Paga",
    tom: "success",
    classeBadge: "border-success/25 bg-success/10 text-success",
    cor: "var(--success)",
    descricao: "pagamento registrado",
  },
  CANCELADA: {
    rotulo: "Cancelada",
    tom: "warning",
    classeBadge: "border-warning/25 bg-warning/10 text-warning",
    cor: "var(--warning)",
    descricao: "saiu da cobrança por decisão da operação",
  },
  ABORTADA: {
    rotulo: "Encerrada",
    tom: "default",
    classeBadge: "border-border bg-muted text-foreground-muted",
    cor: "var(--muted-foreground)",
    descricao: "plano interrompido antes desta parcela",
  },
};

export const ROTULOS_MODO_CANCELAMENTO = {
  PONTUAL: {
    titulo: "Cancelar apenas esta parcela",
    descricao: "As demais parcelas do plano seguem na cobrança.",
  },
  SUBSEQUENTES: {
    titulo: "Cancelar esta e encerrar as próximas",
    descricao: "As parcelas seguintes em aberto saem da cobrança futura.",
  },
} as const;
