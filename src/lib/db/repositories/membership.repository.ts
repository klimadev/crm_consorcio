import type Database from 'better-sqlite3';
import type { ManagerScope } from '@/types';
import type { Role } from '@/types/auth';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_active: number;
}

interface MembershipRow {
  id: string;
  company_id: string;
  user_id: string;
  role: Role;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export const membershipRepository = {
  findUserByEmail(db: Database.Database, email: string): UserRow | null {
    const row = db
      .prepare('SELECT id, email, password_hash, name, is_active FROM users WHERE email = ? LIMIT 1')
      .get(email) as UserRow | undefined;
    return row ?? null;
  },

  findUserById(db: Database.Database, userId: string): UserRow | null {
    const row = db
      .prepare('SELECT id, email, password_hash, name, is_active FROM users WHERE id = ? LIMIT 1')
      .get(userId) as UserRow | undefined;
    return row ?? null;
  },

  createUser(db: Database.Database, input: { id: string; email: string; passwordHash: string; fullName: string; companyId?: string; role?: Role }): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, tenant_id, company_id, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      input.id,
      input.email,
      input.passwordHash,
      input.fullName,
      input.companyId || null,
      input.companyId || null,
      input.role || 'COLLABORATOR',
      now,
      now,
    );
  },

  createMembership(db: Database.Database, input: { id: string; companyId: string; userId: string; role: Role }): void {
    db.prepare('INSERT INTO memberships (id, company_id, user_id, role) VALUES (?, ?, ?, ?)').run(
      input.id,
      input.companyId,
      input.userId,
      input.role,
    );
  },

  findActiveMembership(db: Database.Database, companyId: string, userId: string): MembershipRow | null {
    const row = db
      .prepare(
        "SELECT id, company_id, user_id, role, status FROM memberships WHERE company_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1",
      )
      .get(companyId, userId) as MembershipRow | undefined;
    return row ?? null;
  },

  listManagerScopes(db: Database.Database, companyId: string, membershipId: string): ManagerScope[] {
    const rows = db
      .prepare(
        'SELECT scope_type, pdv_id, team_id FROM manager_scopes WHERE company_id = ? AND membership_id = ?',
      )
      .all(companyId, membershipId) as Array<{ scope_type: 'PDV' | 'TEAM'; pdv_id: string | null; team_id: string | null }>;

    return rows.map((row) => ({
      scopeType: row.scope_type,
      pdvId: row.pdv_id,
      teamId: row.team_id,
    }));
  },

  replaceManagerScopes(
    db: Database.Database,
    input: { companyId: string; membershipId: string; scopes: ManagerScope[] },
  ): void {
    db.prepare('DELETE FROM manager_scopes WHERE company_id = ? AND membership_id = ?').run(
      input.companyId,
      input.membershipId,
    );

    const insert = db.prepare(
      'INSERT INTO manager_scopes (id, company_id, membership_id, scope_type, pdv_id, team_id) VALUES (?, ?, ?, ?, ?, ?)',
    );

    for (const scope of input.scopes) {
      insert.run(
        crypto.randomUUID(),
        input.companyId,
        input.membershipId,
        scope.scopeType,
        scope.pdvId,
        scope.teamId,
      );
    }
  },

  addTeamMember(
    db: Database.Database,
    input: { id: string; companyId: string; teamId: string; membershipId: string },
  ): void {
    db.prepare('INSERT INTO team_members (id, company_id, team_id, membership_id) VALUES (?, ?, ?, ?)').run(
      input.id,
      input.companyId,
      input.teamId,
      input.membershipId,
    );
  },

  removeTeamMember(db: Database.Database, input: { companyId: string; teamId: string; membershipId: string }): void {
    db.prepare('DELETE FROM team_members WHERE company_id = ? AND team_id = ? AND membership_id = ?').run(
      input.companyId,
      input.teamId,
      input.membershipId,
    );
  },

  listTeamMembers(db: Database.Database, companyId: string, teamId: string): Array<{ membershipId: string }> {
    return db
      .prepare('SELECT membership_id as membershipId FROM team_members WHERE company_id = ? AND team_id = ?')
      .all(companyId, teamId) as Array<{ membershipId: string }>;
  },
};
