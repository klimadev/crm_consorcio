import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingWhatsappSteps: TourStep[] = [
  {
    id: "sidebar-whatsapp",
    selector: TOUR_SELECTORS.sidebarWhatsapp,
    position: "right",
    stepInteraction: true,
    title: "WhatsApp",
    content: "Conecte multiplas instancias WhatsApp, crie automacoes de mensagens por mudanca de estagio e acompanhe fila de envios.",
  },
];
