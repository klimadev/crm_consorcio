import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingWelcomeSteps: TourStep[] = [
  {
    id: "welcome",
    selector: TOUR_SELECTORS.body,
    position: "center",
    title: "Bem-vindo ao CRM",
    content: "Vamos fazer um tour rapido para mostrar os principais modulos do sistema.",
  },
];
