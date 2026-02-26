import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourBundle } from "@/modules/onboarding/types";

export const dashboardInitialBundle: TourBundle = {
  key: "dashboard-initial",
  storageScope: "dashboard-initial",
  steps: [
    {
      id: "welcome",
      selector: TOUR_SELECTORS.body,
      position: "center",
      title: "Bem-vindo ao CRM",
      content: "Vamos fazer um tour rapido para mostrar como comecar no painel.",
    },
    {
      id: "sidebar-module-1",
      selector: TOUR_SELECTORS.sidebarModule1,
      position: "right",
      stepInteraction: true,
      title: "Seu primeiro modulo",
      content: "Acesse este item da barra lateral para acompanhar os principais dados do time.",
    },
  ],
};
