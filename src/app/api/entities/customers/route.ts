import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { 
  getCustomersByTenantId, createCustomer, updateCustomer, deleteCustomer, 
  getCustomerById, getCustomersByPdvId 
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pdvId = searchParams.get('pdvId');

    if (id) {
      const customer = getCustomerById(id);
      if (!customer || customer.tenant_id !== tenantId) {
        throw new AppError('NOT_FOUND', 'Cliente não encontrado', 404);
      }
      return ok(customer);
    }

    if (pdvId) {
      const customers = getCustomersByPdvId(tenantId, pdvId);
      return ok(customers);
    }

    const customers = getCustomersByTenantId(tenantId);
    return ok(customers);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const body = await request.json();
    const { name, type, document, email, phone, status, pdvId } = body;

    if (!name) {
      throw new AppError('VALIDATION_ERROR', 'Nome é obrigatório', 400);
    }

    const customer = createCustomer(
      tenantId,
      name,
      type || 'PJ',
      document || '',
      email || '',
      phone || '',
      status || 'LEAD',
      pdvId || null
    );
    return ok(customer, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const body = await request.json();
    const { id, name, type, document, email, phone, status, pdvId } = body;

    if (!id || !name) {
      throw new AppError('VALIDATION_ERROR', 'ID e nome são obrigatórios', 400);
    }

    const existing = getCustomerById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Cliente não encontrado', 404);
    }

    const customer = updateCustomer(
      id,
      name,
      type || 'PJ',
      document || '',
      email || '',
      phone || '',
      status || 'LEAD',
      pdvId || null
    );
    return ok(customer);
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
      throw new AppError('FORBIDDEN', 'Sem permissão para deletar clientes', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new AppError('VALIDATION_ERROR', 'ID é obrigatório', 400);
    }

    const existing = getCustomerById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Cliente não encontrado', 404);
    }

    deleteCustomer(id);
    return ok({ success: true, message: 'Cliente deletado' });
  } catch (error) {
    return fail(error);
  }
}
