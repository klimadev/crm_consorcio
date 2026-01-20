import { verifyToken, parseCookies, type TokenPayload } from './jwt';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface AuthSession {
  user: SessionUser;
}

export async function auth(request?: Request): Promise<AuthSession | null> {
  if (!request) return null;
  
  const cookies = parseCookies(request.headers.get('cookie'));
  const accessToken = cookies.access_token;
  
  if (!accessToken) return null;
  
  const payload = await verifyToken(accessToken);
  if (!payload) return null;
  
  return {
    user: {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      role: payload.role,
      tenantId: payload.tenantId,
    }
  };
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const accessToken = cookies.access_token;
  
  if (!accessToken) return null;
  
  const payload = await verifyToken(accessToken);
  if (!payload) return null;
  
  return {
    id: payload.userId,
    email: payload.email,
    name: payload.email.split('@')[0],
    role: payload.role,
    tenantId: payload.tenantId,
  };
}
