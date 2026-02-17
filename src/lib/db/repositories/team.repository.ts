import type Database from 'better-sqlite3';
import type { Team } from '@/types';

interface TeamRow {
  id: string;
  company_id: string;
  pdv_id: string | null;
  name: string;
  is_active: number;
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    companyId: row.company_id,
    pdvId: row.pdv_id,
    name: row.name,
    isActive: row.is_active === 1,
  };
}

export const teamRepository = {
  listByCompany(db: Database.Database, companyId: string): Team[] {
    const rows = db
      .prepare('SELECT id, company_id, pdv_id, name, is_active FROM teams WHERE company_id = ? ORDER BY name ASC')
      .all(companyId) as TeamRow[];
    return rows.map(toTeam);
  },

  create(db: Database.Database, input: { id: string; companyId: string; pdvId?: string | null; name: string }): Team {
    db.prepare('INSERT INTO teams (id, company_id, pdv_id, name) VALUES (?, ?, ?, ?)').run(
      input.id,
      input.companyId,
      input.pdvId ?? null,
      input.name,
    );

    return {
      id: input.id,
      companyId: input.companyId,
      pdvId: input.pdvId ?? null,
      name: input.name,
      isActive: true,
    };
  },

  update(
    db: Database.Database,
    input: { companyId: string; id: string; pdvId?: string | null; name?: string; isActive?: boolean },
  ): void {
    db.prepare(
      `
      UPDATE teams
      SET
        pdv_id = COALESCE(?, pdv_id),
        name = COALESCE(?, name),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE company_id = ? AND id = ?
      `,
    ).run(input.pdvId ?? null, input.name ?? null, input.isActive === undefined ? null : Number(input.isActive), input.companyId, input.id);
  },
};
