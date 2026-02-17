import { getDb } from '@/lib/db/connection';
import { pdvRepository } from '@/lib/db/repositories/pdv.repository';
import { requireCompanySession } from '@/lib/auth/session';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';

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
    // TODO(rbac): Enforce role guard for mutations (expected: OWNER/ADMIN/MANAGER only).
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
    // TODO(rbac): Enforce role guard for mutations (expected: OWNER/ADMIN/MANAGER only).
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
