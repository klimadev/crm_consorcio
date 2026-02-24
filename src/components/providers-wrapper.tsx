"use client";

import { PendenciasProvider } from "@/modules/kanban/hooks/use-pendencias-globais";
import type { ReactNode } from "react";

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <PendenciasProvider>
      {children}
    </PendenciasProvider>
  );
}
