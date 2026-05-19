"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { LaboratorioFeature } from "../types";

export function useLaboratorio() {
  const pathname = usePathname();

  const features: LaboratorioFeature[] = useMemo(
    () => [
      {
        id: "whatsapp-exporter",
        nome: "WhatsApp Exporter",
        descricao: "Exporte o historico de conversas do WhatsApp em formato texto.",
        icone: "message-circle",
        href: "/laboratorio",
      },
    ],
    [],
  );

  return { features, pathname };
}
