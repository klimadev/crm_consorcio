import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, parseCookies } from '@/lib/auth/jwt';
import { getUserById, getTenantById, getPreferencesByUserId, getWidgetsByUserId, type User } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    const user = getUserById(payload.userId);
    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado ou inativo' },
        { status: 401 }
      );
    }

    const tenant = getTenantById(user.tenant_id);
    const preferences = getPreferencesByUserId(user.id);
    const widgets = getWidgetsByUserId(user.id);

    const prefsMap: Record<string, string> = {};
    for (const pref of preferences) {
      prefsMap[pref.key] = pref.value;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
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
