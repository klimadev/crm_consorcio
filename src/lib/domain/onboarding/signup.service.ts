import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { companyRepository } from '@/lib/db/repositories/company.repository';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { runInTransaction } from '@/lib/db/tx';
import { AppError } from '@/lib/http/errors';
import { requireString } from '@/lib/http/parse';
import type { SignupInput, SignupResult } from '@/types';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface NormalizedInput {
  companyName: string;
  companySlug: string;
  email: string;
  password: string;
  fullName?: string;
}

function normalizeInput(input: SignupInput): NormalizedInput {
  const companyName = requireString(input.companyName, 'companyName');
  const companySlug = generateSlug(companyName);

  return {
    companyName,
    companySlug,
    email: requireString(input.email, 'email').toLowerCase(),
    password: requireString(input.password, 'password'),
    fullName: input.fullName,
  };
}

function createDefaultStages(db: Database.Database, companyId: string): void {
  const stages = [
    { name: 'Prospecção', displayName: 'Prospecção', orderIndex: 0, type: 'OPEN', color: '#3b82f6' },
    { name: 'Qualificação', displayName: 'Qualificação', orderIndex: 1, type: 'OPEN', color: '#8b5cf6' },
    { name: 'Proposta', displayName: 'Proposta', orderIndex: 2, type: 'OPEN', color: '#f59e0b' },
    { name: 'Fechamento', displayName: 'Fechamento', orderIndex: 3, type: 'OPEN', color: '#ec4899' },
    { name: 'Ganho', displayName: 'Ganho', orderIndex: 4, type: 'WON', color: '#10b981' },
    { name: 'Perdido', displayName: 'Perdido', orderIndex: 5, type: 'LOST', color: '#ef4444' },
  ];

  const now = new Date().toISOString();

  for (const stage of stages) {
    db.prepare(`
      INSERT INTO pipeline_stages (id, company_id, tenant_id, name, display_name, order_index, type, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      companyId,
      companyId,
      stage.name,
      stage.displayName,
      stage.orderIndex,
      stage.type,
      stage.color,
      now,
      now
    );
  }
}

export async function signupCompany(db: Database.Database, rawInput: SignupInput): Promise<SignupResult> {
  const input = normalizeInput(rawInput);

  if (!companyRepository.isSlugAvailable(db, input.companySlug)) {
    throw new AppError('CONFLICT', 'Nome da empresa ja esta em uso. Tente outro nome.', 409, {
      field: 'companyName',
    });
  }

  const existingUser = membershipRepository.findUserByEmail(db, input.email);
  if (existingUser) {
    throw new AppError('CONFLICT', 'E-mail ja cadastrado. Faca login ou use outro e-mail.', 409, {
      field: 'email',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const now = new Date().toISOString();

  runInTransaction(db, () => {
    companyRepository.create(db, {
      id: companyId,
      name: input.companyName,
      slug: input.companySlug,
    });

    db.prepare(`
      INSERT INTO tenants (id, name, slug, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(companyId, input.companyName, input.companySlug, now, now);

    membershipRepository.createUser(db, {
      id: userId,
      email: input.email,
      passwordHash,
      fullName: input.fullName || input.email.split('@')[0],
      companyId,
      role: 'OWNER',
    });

    membershipRepository.createMembership(db, {
      id: membershipId,
      companyId,
      userId,
      role: 'OWNER',
    });

    createDefaultStages(db, companyId);
  });

  return {
    companyId,
    ownerMembershipId: membershipId,
  };
}
