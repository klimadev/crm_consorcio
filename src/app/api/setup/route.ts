import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/jwt';
import { getTenantBySlug, createTenant, createUser, getUserByEmail, deleteAllUserSessions } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantName, tenantSlug, adminEmail, adminPassword, adminName } = body;

    if (!tenantName || !tenantSlug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const existingTenant = getTenantBySlug(tenantSlug);

    if (existingTenant) {
      return NextResponse.json(
        { success: false, message: 'Organização já existe' },
        { status: 400 }
      );
    }

    const tenant = createTenant(tenantName, tenantSlug);

    const passwordHash = await hashPassword(adminPassword);

    const admin = createUser(adminEmail, passwordHash, adminName || 'Administrador', 'ADMIN', tenant.id);

    deleteAllUserSessions(admin.id);

    return NextResponse.json({
      success: true,
      message: 'Organização criada com sucesso',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await import('@/lib/db');
    const tenants = db.getQuery(`
      SELECT t.*, (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count
      FROM tenants t
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      tenants: tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        userCount: t.user_count,
        createdAt: t.created_at,
      })),
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
