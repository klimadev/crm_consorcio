import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { 
  getPdvsByTenantId, createPdv, updatePdv, deletePdv, getPdvById, getPdvsByRegionId 
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
    const regionId = searchParams.get('regionId');

    if (id) {
      const pdv = getPdvById(id);
      if (!pdv || pdv.tenant_id !== payload.tenantId) {
        return NextResponse.json({ success: false, message: 'PDV não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, pdv });
    }

    if (regionId) {
      const pdvs = getPdvsByRegionId(payload.tenantId, regionId);
      return NextResponse.json({ success: true, pdvs });
    }

    const pdvs = getPdvsByTenantId(payload.tenantId);
    return NextResponse.json({ success: true, pdvs });
  } catch (error) {
    console.error('Get pdvs error:', error);
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
    const { name, regionId, type, location, address, city, state } = body;
    const resolvedLocation = location ?? [address, city, state].filter(Boolean).join(' - ');

    if (!name) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 });
    }

    const pdv = createPdv(
      payload.tenantId, 
      name, 
      type || 'PHYSICAL_STORE',
      regionId || null, 
      resolvedLocation || ''
    );
    return NextResponse.json({ success: true, pdv });
  } catch (error) {
    console.error('Create pdv error:', error);
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
    const { id, name, regionId, type, location, address, city, state } = body;
    const resolvedLocation = location ?? [address, city, state].filter(Boolean).join(' - ');

    if (!id || !name) {
      return NextResponse.json({ success: false, message: 'ID e nome são obrigatórios' }, { status: 400 });
    }

    const existing = getPdvById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'PDV não encontrado' }, { status: 404 });
    }

    const pdv = updatePdv(id, name, regionId || null, type || 'PHYSICAL_STORE', resolvedLocation || '');
    return NextResponse.json({ success: true, pdv });
  } catch (error) {
    console.error('Update pdv error:', error);
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

    const existing = getPdvById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'PDV não encontrado' }, { status: 404 });
    }

    deletePdv(id);
    return NextResponse.json({ success: true, message: 'PDV deletado' });
  } catch (error) {
    console.error('Delete pdv error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
