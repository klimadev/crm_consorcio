import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formataMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    timeZone: "UTC",
  }).format(valor);
}

export function formataData(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(data));
}

export function aplicaMascaraTelefoneBr(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function aplicaMascaraMoedaBr(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";

  // Convert BigInt para evitar perda de precisão com números grandes
  const centavos = BigInt(digitos);
  const reais = Number(centavos) / 100;
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    timeZone: "UTC",
  }).format(reais);
}

export function converteMoedaBrParaNumero(valor: string) {
  const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Data relativa na linguagem da cobrança: "hoje", "amanhã", "há 12 dias".
export function descreveDataRelativa(data: Date | string) {
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias = Math.round((alvo.getTime() - hoje.getTime()) / UM_DIA_MS);

  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 1) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}
