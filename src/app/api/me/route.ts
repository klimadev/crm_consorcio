import { getServerAuthSession } from '@/auth';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

export async function GET() {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n[api/me:${debugId}] ========== /api/me DEBUG START ==========`);
  
  try {
    console.log(`[api/me:${debugId}] Calling getServerAuthSession()...`);
    const session = await getServerAuthSession();
    
    console.log(`[api/me:${debugId}] Session result: ${session ? 'FOUND' : 'NULL'}`);
    
    if (session) {
      console.log(`[api/me:${debugId}] Session user:`, JSON.stringify(session.user, null, 2));
    }
    
    if (!session?.user) {
      console.log(`[api/me:${debugId}] No session user, throwing UNAUTHORIZED`);
      throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const response = { success: true, user: session.user };
    console.log(`[api/me:${debugId}] Returning success with user`);
    console.log(`[api/me:${debugId}] ========== /api/me DEBUG END (SUCCESS) ==========\n`);
    return ok(response);
  } catch (error) {
    console.error(`[api/me:${debugId}] Error:`, error);
    console.log(`[api/me:${debugId}] ========== /api/me DEBUG END (ERROR) ==========\n`);
    return fail(error);
  }
}
