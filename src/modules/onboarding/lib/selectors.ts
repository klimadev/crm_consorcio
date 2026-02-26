export const TOUR_TARGETS = {
  sidebarModule1: "sidebar-module-1",
} as const;

export const TOUR_SELECTORS = {
  body: "body",
  sidebarModule1: `[data-tour="${TOUR_TARGETS.sidebarModule1}"]`,
} as const;
