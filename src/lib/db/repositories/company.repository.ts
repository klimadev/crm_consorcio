import type Database from 'better-sqlite3';
import type { Company } from '@/types';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  is_active: number;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    planTier: row.plan_tier,
    isActive: row.is_active === 1,
  };
}

export const companyRepository = {
  findBySlug(db: Database.Database, slug: string): Company | null {
    const row = db
      .prepare('SELECT id, name, slug, plan_tier, is_active FROM companies WHERE slug = ? LIMIT 1')
      .get(slug) as CompanyRow | undefined;

    return row ? toCompany(row) : null;
  },

  isSlugAvailable(db: Database.Database, slug: string): boolean {
    const row = db.prepare('SELECT id FROM companies WHERE slug = ? LIMIT 1').get(slug) as { id: string } | undefined;
    return !row;
  },

  create(db: Database.Database, input: { id: string; name: string; slug: string }): Company {
    db.prepare(
      'INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)',
    ).run(input.id, input.name, input.slug);

    return {
      id: input.id,
      name: input.name,
      slug: input.slug,
      planTier: 'FREE',
      isActive: true,
    };
  },
};
