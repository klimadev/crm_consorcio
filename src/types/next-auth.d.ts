import type { DefaultSession } from 'next-auth';
import type { Role } from './auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      userId: string;
      companyId: string;
      membershipId: string;
      role: Role;
      companySlug: string;
      fullName: string;
    };
  }

  interface User {
    userId: string;
    companyId: string;
    membershipId: string;
    role: Role;
    companySlug: string;
    fullName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    companyId: string;
    membershipId: string;
    role: Role;
    companySlug: string;
    fullName: string;
  }
}
