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

export function normalizaTelefoneParaWhatsapp(telefone: string) {
  return telefone.replace(/\D/g, "");
}
