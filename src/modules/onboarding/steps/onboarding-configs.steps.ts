import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingConfigsSteps: TourStep[] = [
  {
    id: "sidebar-configs",
    selector: TOUR_SELECTORS.sidebarConfigs,
    position: "right",
    stepInteraction: true,
    title: "Configuracoes",
    content: "Configure seus PDVs (pontos de venda) e personalize os estagios do funil de vendas.",
  },
];
