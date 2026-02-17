import type Database from 'better-sqlite3';

export function runInTransaction<T>(db: Database.Database, work: () => T): T {
  const tx = db.transaction(() => work());
  return tx();
}
