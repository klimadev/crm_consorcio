import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(process.cwd(), 'data', 'crm.db');

let db: Database | null = null;
let sqlJs: any = null;
let initializing = false;
let initPromise: Promise<void> | null = null;

export async function getDb(): Promise<Database> {
  const globalDb = (global as any).crmDb;
  if (globalDb) return globalDb;

  if (db) return db;

  if (initializing) {
    while (initializing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return db!;
  }

  initializing = true;
  initPromise = (async () => {
    try {
      const fs = await import('fs');
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (!sqlJs) {
        sqlJs = await initSqlJs({
          locateFile: (file: string) => {
            const path = require('path');
            return path.join(process.cwd(), 'node_modules/sql.js/dist/', file);
          }
        });
      }

      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new sqlJs.Database(fileBuffer);
      } else {
        db = new sqlJs.Database();
      }

      (global as any).crmDb = db;
      initDb();
      saveDb();
    } finally {
      initializing = false;
    }
  })();

  await initPromise;
  return db!;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  }
}

function initDb() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'MANAGER', 'SALES_REP', 'SUPPORT')) NOT NULL DEFAULT 'SALES_REP',
      pdv_id TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, email)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      expires TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pdvs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('PHYSICAL_STORE', 'KIOSK', 'CALL_CENTER', 'ONLINE', 'PARTNER')) NOT NULL,
      region_id TEXT,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('PF', 'PJ')) NOT NULL,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      zip_code TEXT,
      status TEXT CHECK(status IN ('LEAD', 'PROPONENT', 'PENDING', 'ACTIVE', 'DEFAULTING', 'CHURN')) NOT NULL DEFAULT 'LEAD',
      pdv_ids TEXT NOT NULL DEFAULT '[]',
      assigned_employee_ids TEXT NOT NULL DEFAULT '[]',
      custom_values TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      base_price REAL DEFAULT 0,
      attributes TEXT DEFAULT '[]',
      form_schema TEXT DEFAULT '[]',
      automation_steps TEXT DEFAULT '[]',
      default_follow_up_days INTEGER,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      type TEXT CHECK(type IN ('OPEN', 'WON', 'LOST')) NOT NULL,
      automation_steps TEXT DEFAULT '[]',
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      pdv_id TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      value REAL DEFAULT 0,
      stage_id TEXT NOT NULL,
      visibility TEXT CHECK(visibility IN ('PUBLIC', 'RESTRICTED')) NOT NULL DEFAULT 'PUBLIC',
      assigned_employee_ids TEXT DEFAULT '[]',
      product_ids TEXT DEFAULT '[]',
      custom_values TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      next_follow_up_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
      FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      status TEXT CHECK(status IN ('CONNECTED', 'DISCONNECTED')) NOT NULL DEFAULT 'DISCONNECTED',
      config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT CHECK(type IN ('text', 'number', 'date', 'select', 'boolean')) NOT NULL,
      scope TEXT CHECK(scope IN ('DEAL', 'CUSTOMER')) NOT NULL,
      options TEXT DEFAULT '[]',
      required INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      col_span INTEGER DEFAULT 1,
      config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
  db.run('CREATE INDEX IF NOT EXISTS idx_regions_tenant ON regions(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pdvs_tenant ON pdvs(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant ON pipeline_stages(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_deals_customer ON deals(customer_id)');

  console.log('Database initialized successfully');
}

export function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function runQuery(sql: string, params?: any[]) {
  const database = getDbSync();
  if (!database) throw new Error('Database not initialized');
  
  // Filter out undefined values and replace with null
  const safeParams = (params || []).map(p => {
    if (p === undefined) return null;
    return p;
  });
  
  database.run(sql, safeParams);
  saveDb();
}

export function getQuery<T>(sql: string, params?: any[]): T[] {
  const database = getDbSync();
  if (!database) throw new Error('Database not initialized');
  const stmt = database.prepare(sql);
  const results: T[] = [];

  if (params) {
    stmt.bind(params);
  }

  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function getOneQuery<T>(sql: string, params?: any[]): T | null {
  const results = getQuery<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

function getDbSync(): Database | null {
  const globalDb = (global as any).crmDb;
  if (!globalDb) {
    throw new Error('Database not initialized - call getDb() first');
  }
  return globalDb;
}
