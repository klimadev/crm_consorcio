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
      {
        id: "ai-agent",
        nome: "AI Agent",
        descricao: "Analise conversas com IA e gere follow-ups personalizados.",
        icone: "sparkles",
        href: "/laboratorio/ai-agent",
      },
    ],
    [],
  );

  return { features, pathname };
}
