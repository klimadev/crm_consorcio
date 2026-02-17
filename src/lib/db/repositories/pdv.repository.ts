import type Database from 'better-sqlite3';
import type { Pdv } from '@/types';

interface PdvRow {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  is_active: number;
}

function toPdv(row: PdvRow): Pdv {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    code: row.code,
    isActive: row.is_active === 1,
  };
}

export const pdvRepository = {
  listByCompany(db: Database.Database, companyId: string): Pdv[] {
    const rows = db
      .prepare('SELECT id, company_id, name, code, is_active FROM pdvs WHERE company_id = ? ORDER BY name ASC')
      .all(companyId) as PdvRow[];
    return rows.map(toPdv);
  },

  create(db: Database.Database, input: { id: string; companyId: string; name: string; code?: string | null }): Pdv {
    db.prepare('INSERT INTO pdvs (id, company_id, name, code) VALUES (?, ?, ?, ?)').run(
      input.id,
      input.companyId,
      input.name,
      input.code ?? null,
    );

    return {
      id: input.id,
      companyId: input.companyId,
      name: input.name,
      code: input.code ?? null,
      isActive: true,
    };
  },

  update(
    db: Database.Database,
    input: { companyId: string; id: string; name?: string; code?: string | null; isActive?: boolean },
  ): void {
    db.prepare(
      `
      UPDATE pdvs
      SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE company_id = ? AND id = ?
      `,
    ).run(input.name ?? null, input.code ?? null, input.isActive === undefined ? null : Number(input.isActive), input.companyId, input.id);
  },
};
