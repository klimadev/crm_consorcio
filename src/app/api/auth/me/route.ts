import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Importar funções do banco de dados dinamicamente
    const dbModule = await import('@/lib/db');
    const { getUserById, getTenantById, getPreferencesByUserId, getWidgetsByUserId } = dbModule;

    // Buscar informações adicionais do usuário
    const fullUser = getUserById(user.id);
    if (!fullUser || !fullUser.active) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado ou inativo' },
        { status: 401 }
      );
    }

    const tenant = await getTenantById(fullUser.tenant_id);
    const preferences = getPreferencesByUserId(fullUser.id);
    const widgets = getWidgetsByUserId(fullUser.id);

    const prefsMap: Record<string, string> = {};
    for (const pref of preferences) {
      prefsMap[pref.key] = pref.value;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
        tenantId: fullUser.tenant_id,
        pdvId: fullUser.pdv_id ?? null,
        active: fullUser.active,
        tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
        preferences: prefsMap,
        dashboardWidgets: widgets.map(w => ({
          id: w.id,
          widgetType: w.widget_type,
          data: JSON.parse(w.data || '{}'),
          position: w.position,
          size: w.size,
        })),
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
