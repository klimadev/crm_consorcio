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

  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
  });

  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    if (!token) {
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

    return NextResponse.next();
  }

  if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
