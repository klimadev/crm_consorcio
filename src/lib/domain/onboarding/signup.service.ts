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
}

function normalizeInput(input: SignupInput): NormalizedInput {
  const companyName = requireString(input.companyName, 'companyName');
  const companySlug = generateSlug(companyName);

  return {
    companyName,
    companySlug,
    email: requireString(input.email, 'email').toLowerCase(),
    password: requireString(input.password, 'password'),
  };
}

function createDefaultStages(db: Database.Database, companyId: string): void {
  const stages = [
    { name: 'PROSPECTING', displayName: 'Prospecção', orderIndex: 0 },
    { name: 'PROPOSAL', displayName: 'Proposta', orderIndex: 1 },
    { name: 'CONSISTENCY_CHECK', displayName: 'Conferência', orderIndex: 2 },
    { name: 'ADESÃO', displayName: 'Adesão', orderIndex: 3 },
    { name: 'CANCELLED', displayName: 'Cancelado', orderIndex: 4 },
  ];

  const now = new Date().toISOString();

  for (const stage of stages) {
    db.prepare(`
      INSERT INTO pipeline_stages (id, company_id, name, display_name, order_index, type, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      companyId,
      stage.name,
      stage.displayName,
      stage.orderIndex,
      stage.name === 'ADESÃO' ? 'WON' : stage.name === 'CANCELLED' ? 'LOST' : 'OPEN',
      stage.name === 'ADESÃO' ? '#10b981' : stage.name === 'CANCELLED' ? '#ef4444' : '#3b82f6',
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

  runInTransaction(db, () => {
    companyRepository.create(db, {
      id: companyId,
      name: input.companyName,
      slug: input.companySlug,
    });

    membershipRepository.createUser(db, {
      id: userId,
      email: input.email,
      passwordHash,
      fullName: input.email.split('@')[0],
    });

    membershipRepository.createMembership(db, {
      id: membershipId,
      companyId,
      userId,
      role: 'OWNER',
    });

    // Create default pipeline stages - only default data
    createDefaultStages(db, companyId);
  });

  return {
    companyId,
    ownerMembershipId: membershipId,
  };
}
