import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { getLeadDetails, updateLead } from '@/lib/domain/leads/lead.service';
import { parseJsonBody } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';

export async function GET(_: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    return ok(getLeadDetails(getDb(), ctx, leadId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ leadId: string }> }) {
  try {
    const ctx = await requireCompanySession();
    const { leadId } = await context.params;
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const lead = updateLead(getDb(), ctx, leadId, {
      title: typeof body.title === 'string' ? body.title : undefined,
      customerName: typeof body.customerName === 'string' ? body.customerName : undefined,
      customerDocument: typeof body.customerDocument === 'string' ? body.customerDocument : undefined,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone : undefined,
      pdvId: typeof body.pdvId === 'string' ? body.pdvId : undefined,
      teamId: typeof body.teamId === 'string' ? body.teamId : undefined,
      financialTotalValue: typeof body.financialTotalValue === 'number' ? body.financialTotalValue : undefined,
      financialCreditValue: typeof body.financialCreditValue === 'number' ? body.financialCreditValue : undefined,
      financialDownPayment: typeof body.financialDownPayment === 'number' ? body.financialDownPayment : undefined,
      financialMonths: typeof body.financialMonths === 'number' ? body.financialMonths : undefined,
      financialInstallmentValue:
        typeof body.financialInstallmentValue === 'number' ? body.financialInstallmentValue : undefined,
      financialIncome: typeof body.financialIncome === 'number' ? body.financialIncome : undefined,
    });

    return ok(lead);
  } catch (error) {
    return fail(error);
  }
}
