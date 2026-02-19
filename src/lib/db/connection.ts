import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
const defaultDbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'saas.db');

declare global {
  var __crmSaasDb: Database.Database | undefined;
}

function applyPragmas(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
}

function applySchema(db: Database.Database): void {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

export function createDb(databasePath: string): Database.Database {
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(databasePath);
  applyPragmas(db);
  applySchema(db);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__crmSaasDb) {
    global.__crmSaasDb = createDb(defaultDbPath);
  }

  return global.__crmSaasDb;
}

export function createInMemoryDb(): Database.Database {
  const db = new Database(':memory:');
  applyPragmas(db);
  applySchema(db);
  return db;
}

// Aliases for backward compatibility
export const getDatabase = getDb;
export const closeDatabase = closeDb;

/**
 * Close the database connection.
 */
export function closeDb(): void {
  if (global.__crmSaasDb) {
    global.__crmSaasDb.close();
    global.__crmSaasDb = undefined;
  }
}

/**
 * Initialize database (alias for getDb for backward compatibility)
 */
export function initDb(): Database.Database {
  return getDb();
}
