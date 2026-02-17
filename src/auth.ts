import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth.config';

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

export { authOptions };
