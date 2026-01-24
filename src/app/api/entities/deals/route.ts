import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { 
  getDealsByTenantId, createDeal, updateDeal, deleteDeal, getDealById, 
  getDealsByPdvId, getDealsByStageId, getDealsByCustomerId 
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
    const pdvId = searchParams.get('pdvId');
    const stageId = searchParams.get('stageId');
    const customerId = searchParams.get('customerId');

    if (id) {
      const deal = getDealById(id);
      if (!deal || deal.tenant_id !== payload.tenantId) {
        return NextResponse.json({ success: false, message: 'Negociação não encontrada' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deal });
    }

    if (pdvId) {
      const deals = getDealsByPdvId(payload.tenantId, pdvId);
      return NextResponse.json({ success: true, deals });
    }

    if (stageId) {
      const deals = getDealsByStageId(payload.tenantId, stageId);
      return NextResponse.json({ success: true, deals });
    }

    if (customerId) {
      const deals = getDealsByCustomerId(payload.tenantId, customerId);
      return NextResponse.json({ success: true, deals });
    }

    const deals = getDealsByTenantId(payload.tenantId);
    return NextResponse.json({ success: true, deals });
  } catch (error) {
    console.error('Get deals error:', error);
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

    const canCreate = payload.role === 'ADMIN' || payload.role === 'MANAGER' || payload.role === 'SALES_REP';

    if (!canCreate) {
      return NextResponse.json({ success: false, message: 'Sem permissão para criar negociações' }, { status: 403 });
    }

    const body = await request.json();
    const { title, value, stageId, customerId, pdvId, productId, productIds, tags, notes } = body;

    if (!title || !stageId) {
      return NextResponse.json({ success: false, message: 'Título e estágio são obrigatórios' }, { status: 400 });
    }

    const deal = createDeal(
      payload.tenantId,
      title,
      value || 0,
      stageId,
      customerId || null,
      pdvId || null,
      productId || null,
      productIds ? JSON.stringify(productIds) : '[]',
      tags ? JSON.stringify(tags) : '[]',
      notes || ''
    );
    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('Create deal error:', error);
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

    const canEdit = payload.role === 'ADMIN' || payload.role === 'MANAGER' || payload.role === 'SALES_REP';

    if (!canEdit) {
      return NextResponse.json({ success: false, message: 'Sem permissão para editar negociações' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, value, stageId, customerId, pdvId, productId, productIds, tags, notes } = body;

    if (!id || !title || !stageId) {
      return NextResponse.json({ success: false, message: 'ID, título e estágio são obrigatórios' }, { status: 400 });
    }

    const existing = getDealById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Negociação não encontrada' }, { status: 404 });
    }

    const deal = updateDeal(
      id,
      title,
      value || 0,
      stageId,
      customerId || null,
      pdvId || null,
      productId || null,
      productIds ? JSON.stringify(productIds) : '[]',
      tags ? JSON.stringify(tags) : '[]',
      notes || ''
    );
    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('Update deal error:', error);
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

    const existing = getDealById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Negociação não encontrada' }, { status: 404 });
    }

    deleteDeal(id);
    return NextResponse.json({ success: true, message: 'Negociação deletada' });
  } catch (error) {
    console.error('Delete deal error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
