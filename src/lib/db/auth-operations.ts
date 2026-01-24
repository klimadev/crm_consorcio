import {
  getPreferencesByUserId,
  upsertPreference,
  getWidgetsByUserId as getDashboardWidgets,
  createWidget as createDashboardWidget,
  updateWidget as updateDashboardWidget,
  deleteWidget as deleteDashboardWidget
} from './index';

export function getPreferences(userId: string) {
  return getPreferencesByUserId(userId);
}

export { upsertPreference, getDashboardWidgets, createDashboardWidget, updateDashboardWidget, deleteDashboardWidget };
