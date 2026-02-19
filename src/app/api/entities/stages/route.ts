import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { 
  getPipelineStagesByTenantId, createPipelineStage, updatePipelineStage, 
  deletePipelineStage, getPipelineStageById, reorderPipelineStages 
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();
    const tenantId = ctx.companyId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const stage = getPipelineStageById(id);
      if (!stage || stage.tenant_id !== tenantId) {
        throw new AppError('NOT_FOUND', 'Estágio não encontrado', 404);
      }
      return ok(stage);
    }

    const stages = getPipelineStagesByTenantId(tenantId);
    return ok(stages);
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
      throw new AppError('FORBIDDEN', 'Sem permissão para criar estágios', 403);
    }

    const body = await request.json();
    const { name, type } = body;

    if (!name) {
      throw new AppError('VALIDATION_ERROR', 'Nome é obrigatório', 400);
    }

    const stage = createPipelineStage(tenantId, {
      name,
      color: body.color || '',
      type: type || 'OPEN',
      automation_steps: body.automation_steps || [],
    });
    return ok(stage, 201);
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
      throw new AppError('FORBIDDEN', 'Sem permissão para editar estágios', 403);
    }

    const body = await request.json();
    const { id, name, type, orderVal, reorder } = body;

    if (reorder && Array.isArray(reorder)) {
      reorderPipelineStages(tenantId, reorder);
      const stages = getPipelineStagesByTenantId(tenantId);
      return ok(stages);
    }

    if (!id || !name) {
      throw new AppError('VALIDATION_ERROR', 'ID e nome são obrigatórios', 400);
    }

    const existing = getPipelineStageById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Estágio não encontrado', 404);
    }

    const stage = updatePipelineStage(
      id,
      name,
      type || 'OPEN',
      orderVal || 0
    );
    return ok(stage);
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
      throw new AppError('FORBIDDEN', 'Sem permissão para deletar estágios', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new AppError('VALIDATION_ERROR', 'ID é obrigatório', 400);
    }

    const existing = getPipelineStageById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new AppError('NOT_FOUND', 'Estágio não encontrado', 404);
    }

    deletePipelineStage(id);
    return ok({ success: true, message: 'Estágio deletado' });
  } catch (error) {
    return fail(error);
  }
}
