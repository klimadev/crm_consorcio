import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { 
  getPipelineStagesByTenantId, createPipelineStage, updatePipelineStage, 
  deletePipelineStage, getPipelineStageById, reorderPipelineStages 
} from '@/lib/db';

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
    const id = searchParams.get('id');

    if (id) {
      const stage = getPipelineStageById(id);
      if (!stage || stage.tenant_id !== payload.tenantId) {
        return NextResponse.json({ success: false, message: 'Estágio não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, stage });
    }

    const stages = getPipelineStagesByTenantId(payload.tenantId);
    return NextResponse.json({ success: true, stages });
  } catch (error) {
    console.error('Get stages error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 });
    }

    const stage = createPipelineStage(payload.tenantId, {
      name,
      color: body.color || '',
      type: type || 'OPEN',
      automation_steps: body.automation_steps || [],
    });
    return NextResponse.json({ success: true, stage });
  } catch (error) {
    console.error('Create stage error:', error);
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
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, type, orderVal, reorder } = body;

    if (reorder && Array.isArray(reorder)) {
      reorderPipelineStages(payload.tenantId, reorder);
      const stages = getPipelineStagesByTenantId(payload.tenantId);
      return NextResponse.json({ success: true, stages });
    }

    if (!id || !name) {
      return NextResponse.json({ success: false, message: 'ID e nome são obrigatórios' }, { status: 400 });
    }

    const existing = getPipelineStageById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Estágio não encontrado' }, { status: 404 });
    }

    const stage = updatePipelineStage(
      id,
      name,
      type || 'OPEN',
      orderVal || 0
    );
    return NextResponse.json({ success: true, stage });
  } catch (error) {
    console.error('Update stage error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório' }, { status: 400 });
    }

    const existing = getPipelineStageById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Estágio não encontrado' }, { status: 404 });
    }

    deletePipelineStage(id);
    return NextResponse.json({ success: true, message: 'Estágio deletado' });
  } catch (error) {
    console.error('Delete stage error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
