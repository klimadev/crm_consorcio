import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingKanbanSteps: TourStep[] = [
  {
    id: "sidebar-kanban",
    selector: TOUR_SELECTORS.sidebarKanban,
    position: "right",
    stepInteraction: true,
    title: "Kanban",
    content: "No Kanban voce move leads entre estagios e enxerga gargalos da equipe em tempo real.",
  },
];
