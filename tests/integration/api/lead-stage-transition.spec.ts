import { describe, expect, it } from 'vitest';
import { createInMemoryDb } from '@/lib/db/connection';
import { createLead, moveLeadStage, upsertLeadDocument } from '@/lib/domain/leads/lead.service';
import type { RequestContext } from '@/types';

function seedBase(db: ReturnType<typeof createInMemoryDb>, companyId: string, userId: string, membershipId: string): void {
  db.prepare('INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)').run(companyId, 'Acme', 'acme');
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(userId, 'owner@acme.com', 'hash', 'Owner');
  db.prepare('INSERT INTO memberships (id, company_id, user_id, role) VALUES (?, ?, ?, ?)').run(
    membershipId,
    companyId,
    userId,
    'OWNER',
  );
}

describe('lead stage transition integration', () => {
  it('writes consistency check and stage events', () => {
    const db = createInMemoryDb();
    const ctx: RequestContext = {
      userId: 'user-1',
      companyId: 'company-1',
      membershipId: 'mem-1',
      role: 'OWNER',
    };

    seedBase(db, ctx.companyId, ctx.userId, ctx.membershipId);

    const lead = createLead(db, ctx, {
      title: 'Lead',
      customerName: 'Customer',
      financialTotalValue: 100,
      financialCreditValue: 50,
      financialDownPayment: 20,
      financialMonths: 10,
      financialInstallmentValue: 10,
    });

    upsertLeadDocument(db, ctx, lead.id, { documentType: 'RG', fileName: 'rg.pdf', storageKey: 'k/rg' });
    upsertLeadDocument(db, ctx, lead.id, { documentType: 'CPF', fileName: 'cpf.pdf', storageKey: 'k/cpf' });
    upsertLeadDocument(db, ctx, lead.id, { documentType: 'CONTRACT', fileName: 'contract.pdf', storageKey: 'k/contract' });

    moveLeadStage(db, ctx, lead.id, 'PROPOSAL');
    const result = moveLeadStage(db, ctx, lead.id, 'CONSISTENCY_CHECK');

    expect(result.lead.consistencyStatus).toBe('VALID');

    const checksCount = db
      .prepare('SELECT COUNT(*) as count FROM lead_consistency_checks WHERE company_id = ? AND lead_id = ?')
      .get(ctx.companyId, lead.id) as { count: number };
    expect(checksCount.count).toBe(1);

    const eventsCount = db
      .prepare('SELECT COUNT(*) as count FROM lead_stage_events WHERE company_id = ? AND lead_id = ?')
      .get(ctx.companyId, lead.id) as { count: number };
    expect(eventsCount.count).toBe(2);
  });
});
