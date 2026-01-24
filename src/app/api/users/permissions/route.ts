import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { getUserById, updateUserPermissions, getUserPermissions } from '@/lib/db';

const DEFAULT_PERMISSIONS = {
  modules: {
    dashboard: { access: true },
    kanban: { access: true },
    customers: { view: true, create: true, edit: true, delete: false },
    deals: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, export: false },
    settings: { access: false }
  },
  customer_scope: 'all',
  pdv_restricted: false
};

export async function GET(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const targetUserId = userId || payload.userId;

    if (userId && userId !== payload.userId && payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Sem permissão para ver permissões de outros usuários' }, { status: 403 });
    }

    let permissions = getUserPermissions(targetUserId);
    
    if (!permissions) {
      permissions = getDefaultPermissionsForRole(getUserById(targetUserId)?.role || 'SALES_REP');
    }

    return NextResponse.json({ success: true, permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Apenas administradores e gerentes podem alterar permissões' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions) {
      return NextResponse.json({ success: false, message: 'userId e permissions são obrigatórios' }, { status: 400 });
    }

    const targetUser = getUserById(userId);
    if (!targetUser || targetUser.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 });
    }

    updateUserPermissions(userId, JSON.stringify(permissions));
    
    return NextResponse.json({ success: true, message: 'Permissões atualizadas' });
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

function getDefaultPermissionsForRole(role: string): Record<string, any> {
  const base = { ...DEFAULT_PERMISSIONS };
  
  switch (role) {
    case 'ADMIN':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: true },
        customers: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, export: true },
        settings: { access: true }
      };
      base.customer_scope = 'all';
      break;
    case 'MANAGER':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: true },
        customers: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: false },
        reports: { view: true, export: true },
        settings: { access: false }
      };
      base.customer_scope = 'all';
      break;
    case 'SALES_REP':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: true },
        customers: { view: true, create: true, edit: true, delete: false },
        deals: { view: true, create: true, edit: true, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, export: false },
        settings: { access: false }
      };
      base.customer_scope = 'assigned';
      base.pdv_restricted = true;
      break;
    case 'SUPPORT':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: false },
        customers: { view: true, create: false, edit: false, delete: false },
        deals: { view: true, create: false, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        reports: { view: false, export: false },
        settings: { access: false }
      };
      base.customer_scope = 'assigned';
      break;
  }
  
  return base;
}
