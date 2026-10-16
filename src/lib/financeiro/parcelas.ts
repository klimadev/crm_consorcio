import type { Parcela } from "@/lib/api/parcelas";

export type StatusParcelaCalculado = Parcela["status"];

export function inicioDoDia(data: Date | string = new Date()) {
  const dia = new Date(data);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

export function calcularStatusParcela<T extends Pick<Parcela, "status" | "data_vencimento" | "data_pagamento">>(parcela: T): StatusParcelaCalculado {
  if (parcela.status === "CANCELADA" || parcela.status === "ABORTADA") {
    return parcela.status;
  }

  if (parcela.status === "PAGA" || parcela.data_pagamento) {
    return "PAGA";
  }

  const hoje = inicioDoDia();
  const vencimento = inicioDoDia(parcela.data_vencimento);
  return vencimento < hoje ? "ATRASADA" : "AGUARDANDO";
}

export function computarStatusParcelas<T extends Pick<Parcela, "status" | "data_vencimento" | "data_pagamento">>(parcelas: T[]) {
  return parcelas.map((parcela) => ({
    ...parcela,
    status: calcularStatusParcela(parcela),
  }));
}

export function somarValorParcelas(parcelas: Array<Pick<Parcela, "valor">>) {
  return parcelas.reduce((acc, parcela) => acc + parcela.valor, 0);
}

export function calcularResumoParcelas<T extends Pick<Parcela, "valor" | "status" | "data_vencimento" | "data_pagamento">>(parcelas: T[]) {
  const parcelasComStatus = computarStatusParcelas(parcelas);
  const recebidas = parcelasComStatus.filter((parcela) => parcela.status === "PAGA");
  const atrasadas = parcelasComStatus.filter((parcela) => parcela.status === "ATRASADA");
  const aguardando = parcelasComStatus.filter((parcela) => parcela.status === "AGUARDANDO");
  const perdidas = parcelasComStatus.filter(
    (parcela) => parcela.status === "CANCELADA" || parcela.status === "ABORTADA",
  );

  const totalRecebido = somarValorParcelas(recebidas);
  const totalAtrasado = somarValorParcelas(atrasadas);
  const totalPendente = somarValorParcelas(aguardando);
  const totalPerdidoChurn = somarValorParcelas(perdidas);
  // Previsto ativo: ignora parcelas canceladas/abortadas (churn).
  const totalPrevisto = totalRecebido + totalAtrasado + totalPendente;
  const denominadorRetencao = totalRecebido + totalPerdidoChurn;

  return {
    totalRecebido,
    totalAtrasado,
    totalPendente,
    totalPrevisto,
    totalPerdidoChurn,
    quantidadeRecebidas: recebidas.length,
    quantidadeAtrasadas: atrasadas.length,
    quantidadePendentes: aguardando.length,
    quantidadePerdidas: perdidas.length,
    taxaAdimplencia: totalPrevisto > 0 ? (totalRecebido / totalPrevisto) * 100 : 0,
    taxaRetencaoParcelas: denominadorRetencao > 0 ? totalRecebido / denominadorRetencao : 1,
  };
}

export function obterParcelasEmAberto<T extends Pick<Parcela, "id" | "numero_parcela" | "status" | "valor">>(
  parcelas: T[],
): T[] {
  return parcelas
    .filter((parcela) => parcela.status === "AGUARDANDO" || parcela.status === "ATRASADA")
    .sort((a, b) => a.numero_parcela - b.numero_parcela);
}

// "Onde o plano parou": por padrão, a primeira parcela em aberto (o sistema
// já sabe; a operadora só confirma). Dela em diante, tudo sai da cobrança
// via cancelamento SUBSEQUENTES, sem apagar nada.
export function calcularEncerramentoPlano<T extends Pick<Parcela, "id" | "numero_parcela" | "status" | "valor">>(
  parcelas: T[],
  idParcelaParada?: string,
) {
  const emAberto = obterParcelasEmAberto(parcelas);
  const parada = emAberto.find((parcela) => parcela.id === idParcelaParada) ?? emAberto[0] ?? null;

  if (!parada) {
    return { parada: null, foraDaCobranca: [] as T[], totalForaDaCobranca: 0 };
  }

  const foraDaCobranca = emAberto.filter((parcela) => parcela.numero_parcela >= parada.numero_parcela);
  return {
    parada,
    foraDaCobranca,
    totalForaDaCobranca: foraDaCobranca.reduce((total, parcela) => total + parcela.valor, 0),
  };
}
