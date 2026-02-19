import { describe, expect, it } from 'vitest';
import { createInMemoryDb } from '@/lib/db/connection';
import { createLead, upsertLeadDocument } from '@/lib/domain/leads/lead.service';
import { AppError } from '@/lib/http/errors';
import type { RequestContext } from '@/types';

describe('lead document upload and manager scope', () => {
  it('manager without scope cannot mutate lead', () => {
    const db = createInMemoryDb();

    db.prepare('INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)').run('company-1', 'Acme', 'acme');
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run('owner', 'owner@acme.com', 'hash', 'Owner');
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(
      'manager',
      'manager@acme.com',
      'hash',
      'Manager',
    );
    db.prepare('INSERT INTO memberships (id, company_id, user_id, role) VALUES (?, ?, ?, ?)').run('mem-owner', 'company-1', 'owner', 'OWNER');
    db.prepare('INSERT INTO memberships (id, company_id, user_id, role) VALUES (?, ?, ?, ?)').run(
      'mem-manager',
      'company-1',
      'manager',
      'MANAGER',
    );

    const ownerCtx: RequestContext = {
      userId: 'owner',
      companyId: 'company-1',
      membershipId: 'mem-owner',
      role: 'OWNER',
    };

    const managerCtx: RequestContext = {
      userId: 'manager',
      companyId: 'company-1',
      membershipId: 'mem-manager',
      role: 'MANAGER',
    };

    const lead = createLead(db, ownerCtx, {
      title: 'Scoped Lead',
      customerName: 'Scope Customer',
    });

    expect(() =>
      upsertLeadDocument(db, managerCtx, lead.id, {
        documentType: 'RG',
        fileName: 'rg.pdf',
        storageKey: 'k/rg',
      }),
    ).toThrow(AppError);
  });
});
