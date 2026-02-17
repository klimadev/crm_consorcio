import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

function assertOwner(role: string): void {
  if (role !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Only OWNER can manage team members.', 403);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; membershipId: string }> },
) {
  try {
    const ctx = await requireCompanySession();
    assertOwner(ctx.role);
    const { id, membershipId } = await context.params;

    membershipRepository.removeTeamMember(getDb(), {
      companyId: ctx.companyId,
      teamId: id,
      membershipId,
    });

    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
