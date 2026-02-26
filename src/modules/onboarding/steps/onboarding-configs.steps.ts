import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingConfigsSteps: TourStep[] = [
  {
    id: "sidebar-configs",
    selector: TOUR_SELECTORS.sidebarConfigs,
    position: "right",
    stepInteraction: true,
    title: "Configuracoes",
    content: "Ajuste estagios, PDVs e regras para adaptar o CRM ao fluxo da sua empresa.",
  },
];
