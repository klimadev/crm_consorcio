import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formataMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formataData(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
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
  }).format(reais);
}

export function converteMoedaBrParaNumero(valor: string) {
  const limpo = valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}
