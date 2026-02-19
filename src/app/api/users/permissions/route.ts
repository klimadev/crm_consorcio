import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { getUserById, updateUserPermissions, getUserPermissions } from '@/lib/db';

const DEFAULT_PERMISSIONS = {
  modules: {
    dashboard: { access: true },
    kanban: { access: true },
    customers: { view: true, create: true, edit: true, delete: false },
    deals: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, export: false },
    settings: { access: false }
  },
  customer_scope: 'all',
  pdv_restricted: false
};

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const targetUserId = userId || ctx.userId;

    // Only OWNER and MANAGER can view other users' permissions
    if (userId && userId !== ctx.userId && ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Sem permissão para ver permissões de outros usuários', 403);
    }

    let permissions = getUserPermissions(targetUserId);
    
    if (!permissions) {
      permissions = getDefaultPermissionsForRole(getUserById(targetUserId)?.role || 'COLLABORATOR');
    }

    return ok({ permissions });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    // Only OWNER and MANAGER can update permissions
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Apenas proprietários e gerentes podem alterar permissões', 403);
    }

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions) {
      throw new AppError('VALIDATION_ERROR', 'userId e permissions são obrigatórios', 400);
    }

    const targetUser = getUserById(userId);
    if (!targetUser || targetUser.tenant_id !== ctx.companyId) {
      throw new AppError('NOT_FOUND', 'Usuário não encontrado', 404);
    }

    updateUserPermissions(userId, JSON.stringify(permissions));
    
    return ok({ message: 'Permissões atualizadas' });
  } catch (error) {
    return fail(error);
  }
}

function getDefaultPermissionsForRole(role: string): Record<string, unknown> {
  const base = { ...DEFAULT_PERMISSIONS };
  
  switch (role) {
    case 'OWNER':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: true },
        customers: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
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
        reports: { view: true, export: true },
        settings: { access: false }
      };
      base.customer_scope = 'all';
      break;
    case 'COLLABORATOR':
      base.modules = {
        dashboard: { access: true },
        kanban: { access: true },
        customers: { view: true, create: true, edit: true, delete: false },
        deals: { view: true, create: true, edit: true, delete: false },
        reports: { view: true, export: false },
        settings: { access: false }
      };
      base.customer_scope = 'assigned';
      base.pdv_restricted = true;
      break;
  }
  
  return base;
}
