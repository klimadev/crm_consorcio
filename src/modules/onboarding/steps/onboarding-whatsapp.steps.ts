import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingWhatsappSteps: TourStep[] = [
  {
    id: "sidebar-whatsapp",
    selector: TOUR_SELECTORS.sidebarWhatsapp,
    position: "right",
    stepInteraction: true,
    title: "WhatsApp",
    content: "Centralize conversas, automacoes e filas de envio para acelerar o atendimento.",
  },
];
