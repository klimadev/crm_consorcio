import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  createSessionDb,
  revokeSessionDb,
  validateRefreshToken,
  verifyToken,
  parseCookies
} from '@/lib/auth/jwt';
import { getUserById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const refreshToken = cookies.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token não encontrado' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido' },
        { status: 401 }
      );
    }

    const isValid = validateRefreshToken(payload.userId, refreshToken);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Sessão expirada ou revogada' },
        { status: 401 }
      );
    }

    revokeSessionDb(refreshToken);

    const user = getUserById(payload.userId);
    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado ou inativo' },
        { status: 401 }
      );
    }

    const accessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    });

    const newRefreshToken = await generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    createSessionDb(user.id, newRefreshToken, expiresAt);

    const response = NextResponse.json({
      success: true,
      message: 'Token renovado com sucesso',
    });

    setAuthCookies(response, accessToken, newRefreshToken);

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
