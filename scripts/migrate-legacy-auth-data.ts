import path from 'node:path';
import Database from 'better-sqlite3';
import { getDb } from '../src/lib/db/connection';

type LegacyTenant = {
  id: string;
  name: string;
  slug: string;
};

type LegacyUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: number | null;
  tenant_id: string;
};

const legacyDbPath = process.env.LEGACY_DATABASE_PATH ?? path.join(process.cwd(), 'data', 'database.db');
const dryRun = process.argv.includes('--dry-run');

function mapMembershipRole(role: string): 'OWNER' | 'MANAGER' | 'COLLABORATOR' {
  if (role === 'ADMIN') {
    return 'OWNER';
  }

  if (role === 'MANAGER') {
    return 'MANAGER';
  }

  return 'COLLABORATOR';
}

function mapMembershipStatus(isActive: number | null): 'ACTIVE' | 'SUSPENDED' {
  return Number(isActive ?? 1) === 1 ? 'ACTIVE' : 'SUSPENDED';
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(row?.name);
}

function run(): void {
  const legacyDb = new Database(legacyDbPath, { readonly: true, fileMustExist: true });
  const targetDb = getDb();

  if (!tableExists(legacyDb, 'tenants') || !tableExists(legacyDb, 'users')) {
    throw new Error('Legacy schema not found in data/database.db (tenants/users missing).');
  }

  const tenants = legacyDb.prepare('SELECT id, name, slug FROM tenants').all() as LegacyTenant[];
  const users = legacyDb.prepare('SELECT id, email, password_hash, name, role, is_active, tenant_id FROM users').all() as LegacyUser[];

  console.log(`Legacy tenants found: ${tenants.length}`);
  console.log(`Legacy users found: ${users.length}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);

  if (dryRun) {
    legacyDb.close();
    return;
  }

  const tx = targetDb.transaction(() => {
    const upsertCompany = targetDb.prepare(`
      INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        updated_at = datetime('now')
    `);

    const upsertUser = targetDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        name = excluded.name,
        is_active = excluded.is_active,
        updated_at = datetime('now')
    `);

    const upsertMembership = targetDb.prepare(`
      INSERT INTO memberships (id, company_id, user_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(company_id, user_id) DO UPDATE SET
        role = excluded.role,
        status = excluded.status,
        updated_at = datetime('now')
    `);

    for (const tenant of tenants) {
      upsertCompany.run(tenant.id, tenant.name, tenant.slug);
    }

    for (const user of users) {
      upsertUser.run(
        user.id,
        user.email,
        user.password_hash,
        user.name,
        Number(user.is_active ?? 1) === 1 ? 1 : 0,
      );

      const membershipId = `legacy-${user.tenant_id}-${user.id}`;
      upsertMembership.run(
        membershipId,
        user.tenant_id,
        user.id,
        mapMembershipRole(user.role),
        mapMembershipStatus(user.is_active),
      );
    }
  });

  tx();
  legacyDb.close();

  console.log('Legacy auth migration completed successfully.');
  console.log('Validate login via NextAuth credentials flow after migration.');
}

run();
