import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies
} from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantSlug } = body;

    if (!email || !password || !tenantSlug) {
      return NextResponse.json(
        { success: false, message: 'Email, senha e organização são obrigatórios' },
        { status: 400 }
      );
    }

    // Importar funções do banco de dados dinamicamente
    const dbModule = await import('@/lib/db');
    const { getTenantBySlug, getUserByEmailAndTenantId, verifyPassword: dbVerifyPassword } = dbModule;

    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: 'Organização não encontrada' },
        { status: 401 }
      );
    }

    const user = await getUserByEmailAndTenantId(email, tenant.id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const isValid = await dbVerifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: 'Conta desativada' },
        { status: 403 }
      );
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
