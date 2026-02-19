import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';

/**
 * Auth function that uses NextAuth JWT token.
 * This provides compatibility with legacy routes that expect { user: { tenantId, ... } }
 */
export async function auth(request?: NextRequest) {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n[auth:${debugId}] ========== AUTH DEBUG START ==========`);
  console.log(`[auth:${debugId}] Request provided: ${!!request}`);
  
  try {
    let token;
    
    if (request) {
      console.log(`[auth:${debugId}] Using provided request`);
      console.log(`[auth:${debugId}] Request URL: ${request.url}`);
      console.log(`[auth:${debugId}] Request headers cookie: ${request.headers.get('cookie')?.substring(0, 200)}...`);
      
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
      });
    } else {
      console.log(`[auth:${debugId}] No request provided, building from headers()`);
      
      // Build a request-like object from headers (for server components)
      const headersList = await headers();
      const cookieHeader = headersList.get('cookie') || '';
      
      console.log(`[auth:${debugId}] Cookie header: ${cookieHeader.substring(0, 200)}...`);
      
      // Parse cookies
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(c => {
        const [key, ...val] = c.trim().split('=');
        if (key) cookies[key] = val.join('=');
      });
      
      console.log(`[auth:${debugId}] Parsed cookies keys: ${Object.keys(cookies).join(', ')}`);
      console.log(`[auth:${debugId}] next-auth.session-token exists: ${!!cookies['next-auth.session-token']}`);
      
      // Create a minimal request object
      const req = {
        headers: Object.fromEntries(headersList.entries()),
        cookies,
      };
      
      token = await getToken({
        req: req as unknown as NextRequest,
        secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
      });
    }
    
    console.log(`[auth:${debugId}] Token result: ${token ? 'FOUND' : 'NULL'}`);
    
    if (token) {
      console.log(`[auth:${debugId}] Token data:`, JSON.stringify({
        userId: token.userId,
        companyId: token.companyId,
        email: token.email,
        role: token.role,
        membershipId: token.membershipId,
      }, null, 2));
    }
    
    if (!token) {
      console.log(`[auth:${debugId}] ========== AUTH DEBUG END (NO TOKEN) ==========\n`);
      return null;
    }

    const result = {
      user: {
        userId: token.userId as string,
        tenantId: token.companyId as string,  // Map companyId -> tenantId
        email: token.email ?? '',
        role: token.role as string,
        membershipId: token.membershipId as string,
        companySlug: token.companySlug as string,
        name: token.fullName as string ?? token.name ?? '',
      }
    };
    
    console.log(`[auth:${debugId}] Returning user:`, JSON.stringify(result.user, null, 2));
    console.log(`[auth:${debugId}] ========== AUTH DEBUG END (SUCCESS) ==========\n`);
    
    return result;
  } catch (error) {
    console.error(`[auth:${debugId}] ========== AUTH DEBUG END (ERROR) ==========`);
    console.error(`[auth:${debugId}] Error:`, error);
    console.error(`[auth:${debugId}] ==============================================\n`);
    return null;
  }
}

/**
 * Get server session - wrapper around auth
 */
export async function getServerSession() {
  return auth();
}

export const handlers = {
  GET: async (request: NextRequest) => {
    const result = await auth(request);
    if (!result) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
  POST: async (request: NextRequest) => {
    const result = await auth(request);
    if (!result) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};
