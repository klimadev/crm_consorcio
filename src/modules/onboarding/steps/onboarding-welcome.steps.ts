import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingWelcomeSteps: TourStep[] = [
  {
    id: "welcome",
    selector: TOUR_SELECTORS.body,
    position: "center",
    title: "Bem-vindo ao CRM Consórcio",
    content: "Sua central para gestionar consórcios. Acompanhe vendas no Resumo, gerencie leads no Kanban, conecte o WhatsApp e configure tudo em Configurações. Vamos começar!",
  },
];
