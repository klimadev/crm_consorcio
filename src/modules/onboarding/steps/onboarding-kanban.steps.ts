import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingKanbanSteps: TourStep[] = [
  {
    id: "sidebar-leads",
    selector: TOUR_SELECTORS.sidebarKanban,
    position: "right",
    stepInteraction: true,
    title: "Leads",
    content: "Gerencie sua pipeline de leads com drag-and-drop. Acompanhe pendências, documentos e aprovações, e receba alertas.",
  },
];
