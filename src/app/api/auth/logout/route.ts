import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, parseCookies, verifyToken, revokeSessionDb } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const refreshToken = cookies.refresh_token;

    if (refreshToken) {
      revokeSessionDb(refreshToken);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });

    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
