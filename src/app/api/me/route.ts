import { getServerAuthSession } from '@/auth';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    // TODO(auth-migration): Normalize response contract for existing CRM consumers (expects Employee-like fields: id/pdvId/active).
    return ok({ success: true, user: session.user });
  } catch (error) {
    return fail(error);
  }
}
