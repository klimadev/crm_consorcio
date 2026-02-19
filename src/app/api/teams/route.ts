import { getDb } from '@/lib/db/connection';
import { teamRepository } from '@/lib/db/repositories/team.repository';
import { requireCompanySession } from '@/lib/auth/session';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

function assertCanManageTeam(ctx: { role: string }) {
  if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
    throw new AppError('FORBIDDEN', 'Only OWNER or MANAGER can manage teams.', 403);
  }
}

export async function GET() {
  try {
    const ctx = await requireCompanySession();
    return ok(teamRepository.listByCompany(getDb(), ctx.companyId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCompanySession();
    assertCanManageTeam(ctx);
    const body = await parseJsonBody<{ name: string; pdvId?: string }>(request);
    const team = teamRepository.create(getDb(), {
      id: crypto.randomUUID(),
      companyId: ctx.companyId,
      name: requireString(body.name, 'name'),
      pdvId: body.pdvId?.trim() || null,
    });
    return ok(team, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCompanySession();
    assertCanManageTeam(ctx);
    const body = await parseJsonBody<{ id: string; name?: string; pdvId?: string | null; isActive?: boolean }>(request);
    teamRepository.update(getDb(), {
      companyId: ctx.companyId,
      id: requireString(body.id, 'id'),
      name: body.name?.trim(),
      pdvId: body.pdvId ?? null,
      isActive: body.isActive,
    });
    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
