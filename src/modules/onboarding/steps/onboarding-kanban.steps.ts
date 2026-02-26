import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingKanbanSteps: TourStep[] = [
  {
    id: "sidebar-kanban",
    selector: TOUR_SELECTORS.sidebarKanban,
    position: "right",
    stepInteraction: true,
    title: "Kanban",
    content: "Gerencie sua pipeline de vendas com drag-and-drop. Acompanhe pendencias (leads estagnados, documentos faltando) e receba alertas.",
  },
];
