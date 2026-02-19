import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { 
  getPdvsByTenantId, createPdv, updatePdv, deletePdv, getPdvById 
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const pdv = getPdvById(id);
      if (!pdv || pdv.tenant_id !== tenantId) {
        throw new AppError('NOT_FOUND', 'PDV não encontrado', 404);
      }
      return ok(pdv);
    }

    const pdvs = getPdvsByTenantId(tenantId);
    return ok(pdvs);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    // Only OWNER and MANAGER can create
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Sem permissão para criar PDVs', 403);
    }

    const body = await request.json();
    const { name, type, location, address, city, state } = body;
    const resolvedLocation = location ?? [address, city, state].filter(Boolean).join(' - ');

    if (!name) {
      throw new AppError('VALIDATION_ERROR', 'Nome é obrigatório', 400);
    }

    const pdv = createPdv(
      tenantId, 
      name, 
      type || 'PHYSICAL_STORE',
      resolvedLocation || ''
    );
    return ok(pdv, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    // Only OWNER and MANAGER can update
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Sem permissão para editar PDVs', 403);
    }

    const body = await request.json();
    const { id, name, type, location, address, city, state } = body;
    const resolvedLocation = location ?? [address, city, state].filter(Boolean).join(' - ');

    if (!id || !name) {
      throw new AppError('VALIDATION_ERROR', 'ID e nome são obrigatórios', 400);
    }

    const existing = getPdvById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'PDV não encontrado', 404);
    }

    const pdv = updatePdv(id, name, type || 'PHYSICAL_STORE', resolvedLocation || '');
    return ok(pdv);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    // Only OWNER and MANAGER can delete
    if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
      throw new AppError('FORBIDDEN', 'Sem permissão para deletar PDVs', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new AppError('VALIDATION_ERROR', 'ID é obrigatório', 400);
    }

    const existing = getPdvById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'PDV não encontrado', 404);
    }

    deletePdv(id);
    return ok({ success: true, message: 'PDV deletado' });
  } catch (error) {
    return fail(error);
  }
}
