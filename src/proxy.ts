import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const publicRoutes = ['/login', '/signup'];
const publicApiPrefixes = ['/api/auth', '/api/public'];

function isPublicApi(pathname: string): boolean {
  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicPage(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const debugId = Math.random().toString(36).substring(7);
  
  console.log(`\n[proxy:${debugId}] ========== PROXY DEBUG START ==========`);
  console.log(`[proxy:${debugId}] Pathname: ${pathname}`);
  console.log(`[proxy:${debugId}] Method: ${request.method}`);
  console.log(`[proxy:${debugId}] Cookie header: ${request.headers.get('cookie')?.substring(0, 200)}...`);

  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico') {
    console.log(`[proxy:${debugId}] Skipping static asset`);
    console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (STATIC) ==========\n`);
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
  });
  
  console.log(`[proxy:${debugId}] Token result: ${token ? 'FOUND' : 'NULL'}`);
  if (token) {
    console.log(`[proxy:${debugId}] Token userId: ${token.userId}`);
    console.log(`[proxy:${debugId}] Token companyId: ${token.companyId}`);
    console.log(`[proxy:${debugId}] Token email: ${token.email}`);
  }

  if (pathname.startsWith('/api/')) {
    console.log(`[proxy:${debugId}] API route detected`);
    
    if (isPublicApi(pathname)) {
      console.log(`[proxy:${debugId}] Public API, allowing`);
      console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (PUBLIC API) ==========\n`);
      return NextResponse.next();
    }

    if (!token) {
      console.log(`[proxy:${debugId}] No token, returning 401`);
      console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (401) ==========\n`);
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autenticacao obrigatoria.',
            details: null,
          },
        },
        { status: 401 },
      );
    }

    console.log(`[proxy:${debugId}] Token valid, allowing API access`);
    console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (API OK) ==========\n`);
    return NextResponse.next();
  }

  if (isPublicPage(pathname)) {
    console.log(`[proxy:${debugId}] Public page, allowing`);
    console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (PUBLIC PAGE) ==========\n`);
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    console.log(`[proxy:${debugId}] No token, redirecting to login`);
    console.log(`[proxy:${debugId}] Callback URL: ${pathname}`);
    console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (REDIRECT TO LOGIN) ==========\n`);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[proxy:${debugId}] Token valid, allowing page access`);
  console.log(`[proxy:${debugId}] ========== PROXY DEBUG END (PAGE OK) ==========\n`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
