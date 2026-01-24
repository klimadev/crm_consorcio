import { NextRequest } from 'next/server';
import { verifyAccessToken, getAuthCookies } from './jwt';

export async function auth(request: NextRequest) {
  const { accessToken } = getAuthCookies();

  if (!accessToken) {
    return null;
  }

  const payload = verifyAccessToken(accessToken);
  return payload ? { user: payload } : null;
}

export async function getServerSession() {
  // This function can be expanded to return session info from cookies
  const { accessToken } = getAuthCookies();

  if (!accessToken) {
    return null;
  }

  const payload = verifyAccessToken(accessToken);
  return payload ? { user: payload } : null;
}

export const handlers = {
  GET: async (request: NextRequest) => {
    const result = await auth(request);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
  POST: async (request: NextRequest) => {
    const result = await auth(request);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
