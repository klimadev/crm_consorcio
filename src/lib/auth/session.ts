import { getServerAuthSession } from '@/auth';
import { AppError } from '@/lib/http/errors';
import type { RequestContext } from '@/types/auth';

export async function requireCompanySession(): Promise<RequestContext> {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user?.companyId || !user?.membershipId || !user?.userId || !user?.role) {
    throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  return {
    userId: user.userId,
    companyId: user.companyId,
    membershipId: user.membershipId,
    role: user.role,
  };
}
