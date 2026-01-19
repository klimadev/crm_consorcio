import { auth } from '@/lib/auth/auth';
import { getProductsByTenant, createProduct, updateProduct, deleteProduct } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Product as ProductDB } from '@/types/db';
import type { Product } from '@/types';

function transformProductToComponent(product: ProductDB): Product {
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    basePrice: product.base_price || 0,
    attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes || '[]') : (product.attributes || []),
    formSchema: typeof product.form_schema === 'string' ? JSON.parse(product.form_schema || '[]') : (product.form_schema || []),
    automationSteps: typeof product.automation_steps === 'string' ? JSON.parse(product.automation_steps || '[]') : (product.automation_steps || []),
    defaultFollowUpDays: product.default_follow_up_days || undefined,
    active: Boolean(product.active),
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productsDB = await getProductsByTenant(session.user.tenantId);
    const products = productsDB.map(transformProductToComponent);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const product = createProduct(session.user.tenantId, {
      name: data.name,
      description: data.description || '',
      category: data.category || '',
      base_price: data.basePrice || data.base_price || 0,
      attributes: data.attributes || [],
      form_schema: data.formSchema || data.form_schema || [],
      automation_steps: data.automationSteps || data.automation_steps || [],
      default_follow_up_days: data.defaultFollowUpDays || data.default_follow_up_days || null,
      active: data.active !== false,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM products WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = updateProduct(data.id, data);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM products WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
