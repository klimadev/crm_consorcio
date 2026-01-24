import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'crm-next-jwt-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // 7 dias

export interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  active: boolean;
}

// Funções para manipulação de tokens
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    if (decoded.type === 'refresh') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}

// Funções para manipulação de cookies
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string): NextResponse {
  // Define o access token como cookie httpOnly
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutos
    path: '/',
  });

  // Define o refresh token como cookie httpOnly
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}

export async function getAuthCookies(): Promise<{ accessToken: string | undefined; refreshToken: string | undefined }> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get('access_token')?.value,
    refreshToken: cookieStore.get('refresh_token')?.value,
  };
}

// Função para verificar autenticação
export async function verifyAuth(request?: NextRequest): Promise<AuthUser | null> {
  let token: string | undefined;

  // Tenta obter o token do header Authorization primeiro
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Se não tiver no header, tenta obter do cookie
  if (!token) {
    const { accessToken } = await getAuthCookies();
    token = accessToken;
  }

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // Aqui você deve buscar os dados do usuário no banco de dados
  // Esta é uma implementação separada para evitar importação direta no middleware
  try {
    const { getUserById } = await import('@/lib/db');
    const user = getUserById(payload.userId);

    if (!user || !user.active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      active: user.active,
    };
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return null;
  }
}

// Função para fazer logout
export async function logout(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso' });
  return clearAuthCookies(response);
}

// Função para atualizar tokens
export async function refreshTokens(refreshToken: string) {
  const refreshPayload = verifyRefreshToken(refreshToken);
  if (!refreshPayload) {
    return null;
  }

  try {
    const { getUserById } = await import('@/lib/db');
    const user = getUserById(refreshPayload.userId);

    if (!user || !user.active) {
      return null;
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('Erro ao atualizar tokens:', error);
    return null;
  }
}

// Funções para hash e verificação de senha (movidas para outro módulo para evitar problemas no middleware)
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

export function verifyToken(token: string): JWTPayload | null {
  return verifyAccessToken(token);
}