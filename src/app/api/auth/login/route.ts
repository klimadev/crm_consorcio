import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByEmail, 
  verifyPassword, 
  createSession,
  getTenantBySlug 
} from '@/lib/db';
import { 
  generateAccessToken, 
  generateRefreshToken,
  setAuthCookies 
} from '@/lib/auth/jwt';
import cookie from 'cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantSlug, callbackUrl } = body;

    console.log('[LOGIN] Attempt for email:', email);

    if (!email || !password) {
      console.log('[LOGIN] Missing credentials');
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email);
    console.log('[LOGIN] User found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('[LOGIN] User not found, returning 401');
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    console.log('[LOGIN] Password valid:', isValid);

    if (!isValid) {
      console.log('[LOGIN] Invalid password, returning 401');
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      console.log('[LOGIN] User inactive, returning 403');
      return NextResponse.json(
        { success: false, message: 'Conta desativada' },
        { status: 403 }
      );
    }

    console.log('[LOGIN] Authentication successful for user:', user.email);

    const accessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    });

    console.log('[LOGIN] Access token generated:', accessToken.substring(0, 50) + '...');

    const refreshToken = await generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    createSession(user.id, refreshToken, expiresAt);

    const redirectUrl = callbackUrl || '/';
    console.log('[LOGIN] Redirecting to:', redirectUrl);
    
    const response = NextResponse.json({
      success: true,
      redirectUrl,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    response.headers.append('Set-Cookie', cookie.serialize('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 15,
    }));

    response.headers.append('Set-Cookie', cookie.serialize('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    }));

    return response;
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
