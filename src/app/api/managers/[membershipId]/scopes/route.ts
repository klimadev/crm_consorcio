import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { parseJsonBody } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import type { ManagerScope } from '@/types';

function assertOwner(role: string): void {
  if (role !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Only OWNER can manage manager scopes.', 403);
  }
}

export async function GET(_: Request, context: { params: Promise<{ membershipId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { membershipId } = await context.params;
    const scopes = membershipRepository.listManagerScopes(getDb(), ctx.companyId, membershipId);
    return ok(scopes);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { membershipId } = await context.params;
    const body = await parseJsonBody<{ scopes: ManagerScope[] }>(request);
    membershipRepository.replaceManagerScopes(getDb(), {
      companyId: ctx.companyId,
      membershipId,
      scopes: Array.isArray(body.scopes) ? body.scopes : [],
    });

    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
