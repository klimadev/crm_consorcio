import Database from 'better-sqlite3';

// Re-export from connection.ts for consistency
export { 
  getDb, 
  getDatabase, 
  closeDatabase, 
  closeDb, 
  createDb, 
  createInMemoryDb,
  initDb 
} from './connection';

// Import getDatabase from connection.ts
import { getDatabase } from './connection';

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function makeId(): string {
  return generateId();
}

/**
 * Execute a query that doesn't return results.
 */
export function executeQuery(sql: string, params: unknown[] = []): void {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.run(params);
}

/**
 * Execute a query that returns a single row.
 */
export function getOneQuery<T>(sql: string, params: unknown[] = []): T | null {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  const result = stmt.get(params);
  return (result as T | undefined) || null;
}

/**
 * Execute a query that returns multiple rows.
 */
export function getQuery<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.all(params) as T[];
}
