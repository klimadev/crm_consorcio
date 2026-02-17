import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { moveLeadStage } from '@/lib/domain/leads/lead.service';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import type { LeadStage } from '@/types';

const stages: LeadStage[] = ['PROSPECTING', 'PROPOSAL', 'CONSISTENCY_CHECK', 'ADESÃO', 'CANCELLED'];

function asLeadStage(value: string): LeadStage {
  if (!stages.includes(value as LeadStage)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid nextStage.', 400);
  }

  return value as LeadStage;
}

export async function POST(request: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    const body = await parseJsonBody<{ nextStage: string; reason?: string }>(request);

    const result = moveLeadStage(getDb(), ctx, leadId, asLeadStage(requireString(body.nextStage, 'nextStage')), body.reason);
    return ok({
      leadId: result.lead.id,
      stage: result.lead.stage,
      consistencyStatus: result.lead.consistencyStatus,
      consistencyIssues: result.consistencyIssues,
    });
  } catch (error) {
    return fail(error);
  }
}
