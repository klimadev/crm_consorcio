import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingResumoSteps: TourStep[] = [
  {
    id: "sidebar-resumo",
    selector: TOUR_SELECTORS.sidebarResumo,
    position: "right",
    stepInteraction: true,
    title: "Resumo",
    content: "Aqui voce acompanha os principais indicadores e uma visao geral da operacao.",
  },
];
