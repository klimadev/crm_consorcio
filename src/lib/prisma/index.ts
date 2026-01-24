import { getPreferences, upsertPreference, getDashboardWidgets, createDashboardWidget, updateDashboardWidget, deleteDashboardWidget } from '@/lib/db/auth-operations';

const prisma = {
  user: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => null,
    findFirst: async ({ where }: { where: { email?: string; tenant?: { slug?: string } } }) => null,
    create: async ({ data }: { data: any }) => data,
  },
  session: {
    create: async ({ data }: { data: any }) => data,
    update: async ({ where, data }: { where: { refreshToken?: string }; data: any }) => data,
    findUnique: async ({ where }: { where: { refreshToken?: string } }) => null,
    deleteMany: async ({ where }: { where: { userId?: string } }) => ({ count: 0 }),
  },
  preference: {
    findMany: async ({ where }: { where: { userId: string } }) => getPreferences(where.userId),
    upsert: async ({ where, update, create }: { where: { userId_key: { userId: string; key: string } }; update: any; create: any }) => {
      upsertPreference(where.userId_key.userId, where.userId_key.key, update.value || create.value);
      return {};
    },
  },
  dashboardWidget: {
    findMany: async ({ where, orderBy }: { where: { userId: string }; orderBy?: any }) => getDashboardWidgets(where.userId),
    create: async ({ data }: { data: any }) => createDashboardWidget(data.userId, data.widgetType, data.data || '{}', data.position, data.size),
    update: async ({ where, data }: { where: { id: string }; data: any }) => updateDashboardWidget(where.id, data.widgetType || data.type, data.data || '{}', data.position || 0, data.size || 'normal'),
    delete: async ({ where }: { where: { id: string } }) => { deleteDashboardWidget(where.id); return {}; },
  },
};

export { prisma };
export default prisma;
