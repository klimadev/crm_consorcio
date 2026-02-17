import { describe, expect, it } from 'vitest';
import { createInMemoryDb } from '@/lib/db/connection';
import { leadRepository } from '@/lib/db/repositories/lead.repository';

function seedCompany(db: ReturnType<typeof createInMemoryDb>, companyId: string, userId: string, membershipId: string): void {
  db.prepare('INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)').run(companyId, 'Acme', `${companyId}-slug`);
  db.prepare('INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)').run(
    userId,
    `${userId}@test.com`,
    'hash',
    'User',
  );
  db.prepare('INSERT INTO memberships (id, company_id, user_id, role) VALUES (?, ?, ?, ?)').run(
    membershipId,
    companyId,
    userId,
    'OWNER',
  );
}

describe('lead repository tenant isolation', () => {
  it('findById requires matching company_id', () => {
    const db = createInMemoryDb();
    seedCompany(db, 'company-a', 'user-a', 'mem-a');
    seedCompany(db, 'company-b', 'user-b', 'mem-b');

    leadRepository.create(db, {
      id: 'lead-a',
      companyId: 'company-a',
      ownerMembershipId: 'mem-a',
      title: 'A',
      customerName: 'Customer A',
    });

    expect(leadRepository.findById(db, 'company-a', 'lead-a')?.id).toBe('lead-a');
    expect(leadRepository.findById(db, 'company-b', 'lead-a')).toBeNull();
  });
});
