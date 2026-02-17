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
  providers: [
    CredentialsProvider({
      name: 'Tenant Credentials',
      credentials: {
        companySlug: { label: 'Company Slug', type: 'text' },
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const companySlug = credentials?.companySlug?.trim().toLowerCase();
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!companySlug || !email || !password) {
          return null;
        }

        const db = getDb();
        const company = companyRepository.findBySlug(db, companySlug);
        if (!company || !company.isActive) {
          return null;
        }

        const user = membershipRepository.findUserByEmail(db, email);
        if (!user || user.is_active !== 1) {
          return null;
        }

        const membership = membershipRepository.findActiveMembership(db, company.id, user.id);
        if (!membership) {
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          userId: user.id,
          companyId: company.id,
          membershipId: membership.id,
          role: membership.role,
          companySlug: company.slug,
          fullName: user.full_name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.userId;
        token.companyId = user.companyId;
        token.membershipId = user.membershipId;
        token.role = user.role;
        token.companySlug = user.companySlug;
        token.fullName = user.fullName;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.companyId = token.companyId;
        session.user.membershipId = token.membershipId;
        session.user.role = token.role;
        session.user.companySlug = token.companySlug;
        session.user.fullName = token.fullName;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'local-dev-secret-change-in-production',
};
