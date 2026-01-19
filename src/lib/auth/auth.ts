import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail, verifyPassword, getTenantById } from '@/lib/db/operations';
import type { NextAuthConfig } from 'next-auth';

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.role = user.role;
        token.pdvId = user.pdvId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantSlug = token.tenantSlug;
        (session.user as any).role = token.role;
        (session.user as any).pdvId = token.pdvId;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnApi = nextUrl.pathname.startsWith('/api');

      if (isOnApi) {
        return true;
      }

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      if (isLoggedIn) {
        return true;
      }

      return false;
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantSlug: { label: 'Organization', type: 'text' },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          throw new Error('Invalid credentials');
        }

        if (!EMAIL_REGEX.test(credentials.email)) {
          throw new Error('Invalid email format');
        }

        const maskedEmail = credentials.email.substring(0, 2) + '***@***.' + credentials.email.split('@')[1]?.substring(0, 2);
        console.log('Login attempt for:', maskedEmail);

        const userWithTenant = await getUserByEmail(credentials.email);
        
        if (!userWithTenant || !userWithTenant.password_hash) {
          throw new Error('Invalid credentials');
        }

        const tenant = await getTenantById(userWithTenant.tenant_id);

        if (!tenant || tenant.slug !== credentials.tenantSlug) {
          throw new Error('Organization not found');
        }

        const isValid = verifyPassword(credentials.password, userWithTenant.password_hash);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        if (!userWithTenant.active) {
          throw new Error('Account is disabled');
        }

        return {
          id: userWithTenant.id,
          name: userWithTenant.name,
          email: userWithTenant.email,
          role: userWithTenant.role,
          pdvId: userWithTenant.pdv_id,
          tenantId: userWithTenant.tenant_id,
          tenantSlug: userWithTenant.tenant_slug,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE || '86400', 10),
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
