import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

function assertOwner(role: string): void {
  if (role !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Only OWNER can manage team members.', 403);
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { id } = await context.params;
    return ok(membershipRepository.listTeamMembers(getDb(), ctx.companyId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { id } = await context.params;
    const body = await parseJsonBody<{ membershipId: string }>(request);

    membershipRepository.addTeamMember(getDb(), {
      id: crypto.randomUUID(),
      companyId: ctx.companyId,
      teamId: id,
      membershipId: requireString(body.membershipId, 'membershipId'),
    });

    return ok({ created: true }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { id } = await context.params;
    const body = await parseJsonBody<{ membershipId: string }>(request);

    membershipRepository.removeTeamMember(getDb(), {
      companyId: ctx.companyId,
      teamId: id,
      membershipId: requireString(body.membershipId, 'membershipId'),
    });

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
