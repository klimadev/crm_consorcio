import { TOUR_SELECTORS } from "@/modules/onboarding/lib/selectors";
import type { TourStep } from "@/modules/onboarding/types";

export const onboardingEquipeSteps: TourStep[] = [
  {
    id: "sidebar-equipe",
    selector: TOUR_SELECTORS.sidebarEquipe,
    position: "right",
    stepInteraction: true,
    title: "Equipe",
    content: "Cadastre e gerencie funcionarios, atribua funcoes (colaborador/gerente) e PDVs. Realize operacoes em lote e reatribua leads ao inativar.",
  },
];
