import { auth } from '@/lib/auth/auth';
import { getQuery } from '@/lib/db';
import { createTenant, createUser, seedTenantData, getTenantBySlug } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await getQuery<any>('SELECT id, name, slug, created_at FROM tenants');
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, slug } = await request.json();
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const existing = await getTenantBySlug(slug);
    if (existing) {
      return NextResponse.json({ error: 'Tenant with this slug already exists' }, { status: 409 });
    }

    const tenant = createTenant(name, slug);
    
    createUser(tenant.id, 'admin@' + slug + '.com', 'admin123', 'Admin', 'ADMIN', null);
    
    seedTenantData(tenant.id);

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
