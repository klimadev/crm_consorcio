import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { getLead } from '@/lib/domain/leads/lead.service';
import { leadRepository } from '@/lib/db/repositories/lead.repository';
import { fail, ok } from '@/lib/http/response';

export async function GET(_: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    getLead(getDb(), ctx, leadId);
    const history = leadRepository.listConsistencyHistory(getDb(), ctx.companyId, leadId);
    return ok(history);
  } catch (error) {
    return fail(error);
  }
}
