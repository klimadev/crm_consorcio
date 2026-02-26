import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingResumoSteps: TourStep[] = [
  {
    id: "sidebar-resumo",
    selector: TOUR_SELECTORS.sidebarResumo,
    position: "right",
    stepInteraction: true,
    title: "Resumo",
    content: "Acompanhe valor total em aberto, receita fechada e taxa de conversao. Veja grafico de vendas dos ultimos 6 meses.",
  },
];
