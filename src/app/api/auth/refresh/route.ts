import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  refreshTokens
} from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Obter refresh token dos cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token não encontrado' },
        { status: 401 }
      );
    }

    // Importar função de atualização de tokens dinamicamente
    const jwtAuthModule = await import('@/lib/auth/jwt');
    const tokens = await jwtAuthModule.refreshTokens(refreshToken);
    if (!tokens) {
      return NextResponse.json(
        { success: false, message: 'Sessão expirada ou revogada' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Token renovado com sucesso',
    });

    return setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
