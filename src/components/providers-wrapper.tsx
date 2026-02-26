"use client";

import type { SessaoToken } from "@/lib/tipos";
import { OnboardingTourProvider } from "@/modules/onboarding/providers/onboarding-tour-provider";
import { PendenciasProvider } from "@/modules/kanban/hooks/use-pendencias-globais";
import type { ReactNode } from "react";

export function ProvidersWrapper({ children, sessao }: { children: ReactNode; sessao: SessaoToken }) {
  return (
    <OnboardingTourProvider
      identity={{
        tenantId: sessao.id_empresa,
        userId: sessao.id_usuario,
        perfil: sessao.perfil,
      }}
    >
      <PendenciasProvider>{children}</PendenciasProvider>
    </OnboardingTourProvider>
  );
}
