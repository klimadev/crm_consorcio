import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { 
  getCustomersByTenantId, createCustomer, updateCustomer, deleteCustomer, getCustomerById, getCustomersByPdvId 
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

    if (id) {
      const customer = getCustomerById(id);
      if (!customer || customer.tenant_id !== payload.tenantId) {
        return NextResponse.json({ success: false, message: 'Cliente não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, customer });
    }

    if (pdvId) {
      const customers = getCustomersByPdvId(payload.tenantId, pdvId);
      return NextResponse.json({ success: true, customers });
    }

    const customers = getCustomersByTenantId(payload.tenantId);
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Get customers error:', error);
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
      return NextResponse.json({ success: false, message: 'Sem permissão para criar clientes' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, document, email, phone, status, pdvId } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 });
    }

    const customer = createCustomer(
      payload.tenantId,
      name,
      type || 'PJ',
      document || '',
      email || '',
      phone || '',
      status || 'LEAD',
      pdvId || null
    );
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
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
      return NextResponse.json({ success: false, message: 'Sem permissão para editar clientes' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, type, document, email, phone, status, pdvId } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, message: 'ID e nome são obrigatórios' }, { status: 400 });
    }

    const existing = getCustomerById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Cliente não encontrado' }, { status: 404 });
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
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Update customer error:', error);
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

    const existing = getCustomerById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Cliente não encontrado' }, { status: 404 });
    }

    deleteCustomer(id);
    return NextResponse.json({ success: true, message: 'Cliente deletado' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
