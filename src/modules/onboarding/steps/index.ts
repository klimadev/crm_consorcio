import type { Perfil } from "@/lib/tipos";
import { onboardingConfigsSteps } from "@/modules/onboarding/steps/onboarding-configs.steps";
import { onboardingEquipeSteps } from "@/modules/onboarding/steps/onboarding-equipe.steps";
import { onboardingKanbanSteps } from "@/modules/onboarding/steps/onboarding-kanban.steps";
import { onboardingWelcomeSteps } from "@/modules/onboarding/steps/onboarding-welcome.steps";
import { onboardingWhatsappSteps } from "@/modules/onboarding/steps/onboarding-whatsapp.steps";
import type { TourBundle } from "@/modules/onboarding/types";

export function buildDashboardInitialBundle(perfil: Perfil): TourBundle {
  const steps = [
    ...onboardingWelcomeSteps,
    ...onboardingKanbanSteps,
    ...(perfil !== "COLABORADOR" ? onboardingEquipeSteps : []),
    ...(perfil === "EMPRESA" ? onboardingWhatsappSteps : []),
    ...(perfil === "EMPRESA" ? onboardingConfigsSteps : []),
  ];

  return {
    key: "dashboard-initial",
    storageScope: "dashboard-initial",
    steps,
  };
}
