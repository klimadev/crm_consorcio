import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { 
  getProductsByTenantId, createProduct, updateProduct, deleteProduct, getProductById, getProductsByPdvId 
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
      const product = getProductById(id);
      if (!product || product.tenant_id !== payload.tenantId) {
        return NextResponse.json({ success: false, message: 'Produto não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, product });
    }

    if (pdvId) {
      const products = getProductsByPdvId(payload.tenantId, pdvId);
      return NextResponse.json({ success: true, products });
    }

    const products = getProductsByTenantId(payload.tenantId);
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
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

    const userPermissions = payload.role === 'ADMIN' || payload.role === 'MANAGER' ? { modules: { products: { create: true } } } : null;

    const canCreate = payload.role === 'ADMIN' || payload.role === 'MANAGER' || 
      (userPermissions?.modules?.products?.create === true);

    if (!canCreate) {
      return NextResponse.json({ success: false, message: 'Sem permissão para criar produtos' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sku, price, attributes, pdvId } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400 });
    }

    const product = createProduct(
      payload.tenantId,
      name,
      sku || '',
      price || 0,
      attributes ? JSON.stringify(attributes) : '[]',
      pdvId || null
    );
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
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

    const userPermissions = payload.role === 'ADMIN' || payload.role === 'MANAGER' ? { modules: { products: { edit: true } } } : null;
    const canEdit = payload.role === 'ADMIN' || payload.role === 'MANAGER' || 
      (userPermissions?.modules?.products?.edit === true);

    if (!canEdit) {
      return NextResponse.json({ success: false, message: 'Sem permissão para editar produtos' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, sku, price, attributes, pdvId } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, message: 'ID e nome são obrigatórios' }, { status: 400 });
    }

    const existing = getProductById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Produto não encontrado' }, { status: 404 });
    }

    const product = updateProduct(
      id,
      name,
      sku || '',
      price || 0,
      attributes ? JSON.stringify(attributes) : '[]',
      pdvId || null
    );
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
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

    const existing = getProductById(id);
    if (!existing || existing.tenant_id !== payload.tenantId) {
      return NextResponse.json({ success: false, message: 'Produto não encontrado' }, { status: 404 });
    }

    deleteProduct(id);
    return NextResponse.json({ success: true, message: 'Produto deletado' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
