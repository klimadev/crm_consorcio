import { cn } from "@/lib/utils";
import { PASTEL_COLORS } from "../../constants";

function obterIniciais(nome: string) {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (partes.length === 0) {
    return "?";
  }

  return partes.map((parte) => parte[0]?.toUpperCase() ?? "").join("");
}

function obterCorAvatar(nome: string) {
  const indice = nome.charCodeAt(0) % PASTEL_COLORS.length;
  return PASTEL_COLORS[indice];
}

type AvatarProps = {
  nome: string;
  tamanho?: "sm" | "md" | "lg";
};

export function Avatar({ nome, tamanho = "md" }: AvatarProps) {
  const cor = obterCorAvatar(nome);
  const iniciais = obterIniciais(nome);

  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-xl font-semibold text-white shadow-sm ring-1 ring-black/5",
        sizes[tamanho],
        cor.bg.replace("bg-", "bg-gradient-to-br from-"),
        cor.text.replace("text-", "text-"),
      )}
    >
      {iniciais}
    </span>
  );
}
