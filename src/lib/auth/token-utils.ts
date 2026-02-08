import jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'crm-next-jwt-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // 15 minutos
const ACCESS_TOKEN_EXPIRY: jwt.SignOptions['expiresIn'] = ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRY: jwt.SignOptions['expiresIn'] = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

// Funções para manipulação de tokens (sem dependência de banco de dados)
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY }); // 7 dias
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
export function setAuthCookies(response: Response, accessToken: string, refreshToken: string): Response {
  // Como estamos no Edge Runtime, precisamos lidar com os cookies de forma diferente
  // Este código será usado apenas no lado do servidor em rotas API normais, não no middleware
  return response;
}

export function clearAuthCookies(response: Response): Response {
  // Limpar cookies
  return response;
}

export function getAuthCookies(): { accessToken: string | undefined; refreshToken: string | undefined } {
  // Esta função não funcionará no Edge Runtime, precisa ser usada apenas em contextos de servidor adequados
  if (typeof window !== 'undefined') {
    // Cliente - não faz nada
    return { accessToken: undefined, refreshToken: undefined };
  }
  // Servidor - implementar conforme necessário
  return { accessToken: undefined, refreshToken: undefined };
}
