import { getDb } from '@/lib/db/connection';
import { pdvRepository } from '@/lib/db/repositories/pdv.repository';
import { requireCompanySession } from '@/lib/auth/session';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';

function assertCanManagePdv(ctx: { role: string }) {
  if (ctx.role !== 'OWNER' && ctx.role !== 'MANAGER') {
    throw new AppError('FORBIDDEN', 'Only OWNER or MANAGER can manage PDVs.', 403);
  }
}

export async function GET() {
  try {
    const ctx = await requireCompanySession();
    return ok(pdvRepository.listByCompany(getDb(), ctx.companyId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCompanySession();
    assertCanManagePdv(ctx);
    const body = await parseJsonBody<{ name: string; code?: string }>(request);
    const pdv = pdvRepository.create(getDb(), {
      id: crypto.randomUUID(),
      companyId: ctx.companyId,
      name: requireString(body.name, 'name'),
      code: body.code?.trim() || null,
    });
    return ok(pdv, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCompanySession();
    assertCanManagePdv(ctx);
    const body = await parseJsonBody<{ id: string; name?: string; code?: string | null; isActive?: boolean }>(request);
    pdvRepository.update(getDb(), {
      companyId: ctx.companyId,
      id: requireString(body.id, 'id'),
      name: body.name?.trim(),
      code: body.code ?? null,
      isActive: body.isActive,
    });
    return ok({ updated: true });
  } catch (error) {
    return fail(error);
  }
}
