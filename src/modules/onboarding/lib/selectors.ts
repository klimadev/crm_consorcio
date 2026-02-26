export const TOUR_TARGETS = {
  sidebarResumo: "sidebar-resumo",
  sidebarKanban: "sidebar-kanban",
  sidebarEquipe: "sidebar-equipe",
  sidebarWhatsapp: "sidebar-whatsapp",
  sidebarConfigs: "sidebar-configs",
} as const;

export const TOUR_SELECTORS = {
  body: "body",
  sidebarResumo: `[data-tour="${TOUR_TARGETS.sidebarResumo}"]`,
  sidebarKanban: `[data-tour="${TOUR_TARGETS.sidebarKanban}"]`,
  sidebarEquipe: `[data-tour="${TOUR_TARGETS.sidebarEquipe}"]`,
  sidebarWhatsapp: `[data-tour="${TOUR_TARGETS.sidebarWhatsapp}"]`,
  sidebarConfigs: `[data-tour="${TOUR_TARGETS.sidebarConfigs}"]`,
} as const;
