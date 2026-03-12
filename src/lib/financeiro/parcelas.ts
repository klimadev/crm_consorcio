import type { Parcela } from "@/lib/api/parcelas";

export type StatusParcelaCalculado = Parcela["status"];

export function inicioDoDia(data: Date | string = new Date()) {
  const dia = new Date(data);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

export function calcularStatusParcela<T extends Pick<Parcela, "status" | "data_vencimento" | "data_pagamento">>(parcela: T): StatusParcelaCalculado {
  if (parcela.status === "PAGO" || parcela.data_pagamento) {
    return "PAGO";
  }

  const hoje = inicioDoDia();
  const vencimento = inicioDoDia(parcela.data_vencimento);
  return vencimento < hoje ? "ATRASADO" : "PENDENTE";
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
  const recebidas = parcelasComStatus.filter((parcela) => parcela.status === "PAGO");
  const atrasadas = parcelasComStatus.filter((parcela) => parcela.status === "ATRASADO");
  const pendentes = parcelasComStatus.filter((parcela) => parcela.status === "PENDENTE");

  const totalRecebido = somarValorParcelas(recebidas);
  const totalAtrasado = somarValorParcelas(atrasadas);
  const totalPendente = somarValorParcelas(pendentes);
  const totalPrevisto = somarValorParcelas(parcelasComStatus);

  return {
    totalRecebido,
    totalAtrasado,
    totalPendente,
    totalPrevisto,
    quantidadeRecebidas: recebidas.length,
    quantidadeAtrasadas: atrasadas.length,
    quantidadePendentes: pendentes.length,
    taxaAdimplencia: totalPrevisto > 0 ? (totalRecebido / totalPrevisto) * 100 : 0,
  };
}
