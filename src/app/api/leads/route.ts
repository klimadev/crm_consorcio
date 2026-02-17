import { getDb } from '@/lib/db/connection';
import { requireCompanySession } from '@/lib/auth/session';
import { createLead, listLeads } from '@/lib/domain/leads/lead.service';
import { parseJsonBody, requireString } from '@/lib/http/parse';
import { fail, ok } from '@/lib/http/response';

export async function GET() {
  try {
    const ctx = await requireCompanySession();
    return ok(listLeads(getDb(), ctx));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCompanySession();
    const body = await parseJsonBody<{
      title: string;
      customerName: string;
      customerDocument?: string;
      customerEmail?: string;
      customerPhone?: string;
      pdvId?: string;
      teamId?: string;
      ownerMembershipId?: string;
      financialTotalValue?: number;
      financialCreditValue?: number;
      financialDownPayment?: number;
      financialMonths?: number;
      financialInstallmentValue?: number;
      financialIncome?: number;
    }>(request);

    const lead = createLead(getDb(), ctx, {
      title: requireString(body.title, 'title'),
      customerName: requireString(body.customerName, 'customerName'),
      customerDocument: body.customerDocument,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      pdvId: body.pdvId,
      teamId: body.teamId,
      ownerMembershipId: body.ownerMembershipId,
      financialTotalValue: body.financialTotalValue,
      financialCreditValue: body.financialCreditValue,
      financialDownPayment: body.financialDownPayment,
      financialMonths: body.financialMonths,
      financialInstallmentValue: body.financialInstallmentValue,
      financialIncome: body.financialIncome,
    });

    return ok(lead, 201);
  } catch (error) {
    return fail(error);
  }
}
