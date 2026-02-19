import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db/connection';
import { companyRepository } from '@/lib/db/repositories/company.repository';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // false para desenvolvimento
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Tenant Credentials',
      credentials: {
        companySlug: { label: 'Company Slug', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[authorize] Starting authorization...');
        
        const companySlug = credentials?.companySlug?.trim().toLowerCase();
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        console.log('[authorize] companySlug:', companySlug, 'email:', email);

        if (!companySlug || !email || !password) {
          console.log('[authorize] Missing credentials');
          return null;
        }

        const db = getDb();
        const company = companyRepository.findBySlug(db, companySlug);
        console.log('[authorize] Company found:', !!company);
        
        if (!company || !company.isActive) {
          console.log('[authorize] Company not found or inactive');
          return null;
        }

        const user = membershipRepository.findUserByEmail(db, email);
        console.log('[authorize] User found:', !!user);
        
        if (!user || user.is_active !== 1) {
          console.log('[authorize] User not found or inactive');
          return null;
        }

        const membership = membershipRepository.findActiveMembership(db, company.id, user.id);
        console.log('[authorize] Membership found:', !!membership);
        
        if (!membership) {
          console.log('[authorize] No active membership');
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        console.log('[authorize] Password OK:', passwordOk);
        
        if (!passwordOk) {
          console.log('[authorize] Invalid password');
          return null;
        }

        console.log('[authorize] Authorization successful for user:', user.email);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userId: user.id,
          companyId: company.id,
          membershipId: membership.id,
          role: membership.role,
          companySlug: company.slug,
          fullName: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('[jwt callback] User:', user ? 'present' : 'not present');
      
      if (user) {
        token.userId = user.userId;
        token.companyId = user.companyId;
        token.membershipId = user.membershipId;
        token.role = user.role;
        token.companySlug = user.companySlug;
        token.fullName = user.fullName;
      }

      console.log('[jwt callback] Token userId:', token.userId);
      return token;
    },

    async session({ session, token }) {
      console.log('[session callback] Building session from token');
      
      if (session.user) {
        session.user.userId = token.userId;
        session.user.companyId = token.companyId;
        session.user.membershipId = token.membershipId;
        session.user.role = token.role;
        session.user.companySlug = token.companySlug;
        session.user.fullName = token.fullName;
      }

      console.log('[session callback] Session user:', session.user?.email);
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
  debug: true, // Enable debug mode
};
