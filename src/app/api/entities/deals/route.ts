import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { 
  getDealsByTenantId, createDeal, updateDeal, deleteDeal, getDealById, 
  getDealsByPdvId, getDealsByStageId, getDealsByCustomerId 
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pdvId = searchParams.get('pdvId');
    const stageId = searchParams.get('stageId');
    const customerId = searchParams.get('customerId');

    if (id) {
      const deal = getDealById(id);
      if (!deal || deal.tenant_id !== tenantId) {
        throw new AppError('NOT_FOUND', 'Negociação não encontrada', 404);
      }
      return ok(deal);
    }

    if (pdvId) {
      const deals = getDealsByPdvId(tenantId, pdvId);
      return ok(deals);
    }

    if (stageId) {
      const deals = getDealsByStageId(tenantId, stageId);
      return ok(deals);
    }

    if (customerId) {
      const deals = getDealsByCustomerId(tenantId, customerId);
      return ok(deals);
    }

    const deals = getDealsByTenantId(tenantId);
    return ok(deals);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const body = await request.json();
    const { title, value, stageId, customerId, pdvId, notes } = body;

    if (!title || !stageId) {
      throw new AppError('VALIDATION_ERROR', 'Título e estágio são obrigatórios', 400);
    }

    const deal = createDeal(
      tenantId,
      title,
      value || 0,
      stageId,
      customerId || null,
      pdvId || null,
      null,
      '[]',
      '[]',
      notes || ''
    );
    return ok(deal, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const body = await request.json();
    const { id, title, value, stageId, customerId, pdvId, notes } = body;

    if (!id || !title || !stageId) {
      throw new AppError('VALIDATION_ERROR', 'ID, título e estágio são obrigatórios', 400);
    }

    const existing = getDealById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Negociação não encontrada', 404);
    }

    const deal = updateDeal(
      id,
      title,
      value || 0,
      stageId,
      customerId || null,
      pdvId || null,
      null,
      '[]',
      '[]',
      notes || ''
    );
    return ok(deal);
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
      throw new AppError('FORBIDDEN', 'Sem permissão para deletar negociações', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new AppError('VALIDATION_ERROR', 'ID é obrigatório', 400);
    }

    const existing = getDealById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Negociação não encontrada', 404);
    }

    deleteDeal(id);
    return ok({ success: true, message: 'Negociação deletada' });
  } catch (error) {
    return fail(error);
  }
}
