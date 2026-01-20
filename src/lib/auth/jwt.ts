import * as jose from 'jose';
import cookie from 'cookie';
import bcrypt from 'bcryptjs';
import {
  getUserById,
  getSessionByRefreshToken,
  createSession,
  revokeSession,
  getUserByEmail,
  getTenantById,
  type User,
  type Tenant
} from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'crm-next-jwt-secret-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  [key: string]: unknown;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new jose.SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies = cookie.parse(cookieHeader);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(cookies)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.headers.set('Set-Cookie', cookie.serialize('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  }));

  res.headers.append('Set-Cookie', cookie.serialize('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }));
}

export function clearAuthCookies(res: Response): void {
  res.headers.set('Set-Cookie', cookie.serialize('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }));

  res.headers.append('Set-Cookie', cookie.serialize('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }));
}

export function createSessionDb(userId: string, refreshToken: string, expiresAt: string): void {
  createSession(userId, refreshToken, expiresAt);
}

export function revokeSessionDb(refreshToken: string): void {
  revokeSession(refreshToken);
}

export function validateRefreshToken(userId: string, refreshToken: string): boolean {
  const session = getSessionByRefreshToken(refreshToken);
  if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
    return false;
  }
  return session.user_id === userId;
}

export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = getUserById(payload.userId);
  if (!user || !user.is_active) return null;

  const tenant = getTenantById(user.tenant_id);

  return {
    ...user,
    isActive: Boolean(user.is_active),
    tenant,
  };
}

export function getUserFromEmail(email: string) {
  const user = getUserByEmail(email);
  if (!user || !user.is_active) return null;
  return user;
}
