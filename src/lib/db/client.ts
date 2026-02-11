import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.db');

let dbInstance: Database.Database | null = null;

/**
 * Initialize the database connection and create tables if they don't exist.
 */
export function initDb(): Database.Database {
  if (!dbInstance) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');

    dbInstance.exec(`
      -- Tenants table
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'SALES_REP',
        is_active BOOLEAN DEFAULT 1,
        tenant_id TEXT NOT NULL,
        pdv_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
      );

      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        refresh_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Preferences table
      CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Dashboard Widgets table
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        col_span INTEGER DEFAULT 1,
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      -- PDVs table
      CREATE TABLE IF NOT EXISTS pdvs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'PHYSICAL_STORE',
        location TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        pdv_id TEXT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'PJ',
        document TEXT,
        email TEXT,
        phone TEXT,
        zip_code TEXT,
        status TEXT DEFAULT 'LEAD',
        pdv_ids TEXT DEFAULT '[]',
        assigned_employee_ids TEXT DEFAULT '[]',
        custom_values TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        pdv_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        base_price REAL DEFAULT 0,
        sku TEXT,
        price REAL DEFAULT 0,
        attributes TEXT DEFAULT '[]',
        form_schema TEXT DEFAULT '[]',
        automation_steps TEXT DEFAULT '[]',
        default_follow_up_days INTEGER,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
      );

      -- Pipeline Stages table
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        type TEXT DEFAULT 'OPEN',
        automation_steps TEXT DEFAULT '[]',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Tags table
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Deals table
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        pdv_id TEXT,
        product_id TEXT,
        stage_id TEXT NOT NULL,
        title TEXT NOT NULL,
        value REAL DEFAULT 0,
        visibility TEXT DEFAULT 'PUBLIC',
        assigned_employee_ids TEXT DEFAULT '[]',
        product_ids TEXT DEFAULT '[]',
        custom_values TEXT DEFAULT '{}',
        tags TEXT DEFAULT '[]',
        notes TEXT,
        next_follow_up_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE
      );

      -- Sales Consistency & Installment Tracking table
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,

        -- Sale core data
        deal_id TEXT,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        seller_name TEXT NOT NULL,
        pdv_id TEXT,
        product_id TEXT,
        product_name TEXT,

        -- Financial summary
        total_value REAL NOT NULL DEFAULT 0,
        credit_value REAL DEFAULT 0,
        plan_months INTEGER,

        -- Consistency validation
        consistency_status TEXT NOT NULL DEFAULT 'AWAITING_CONSISTENCY',
        validated_by TEXT,
        validated_at DATETIME,
        validation_notes TEXT,

        -- Installment 1
        installment_1_status TEXT DEFAULT 'PENDING',
        installment_1_due_date DATETIME,
        installment_1_received_date DATETIME,
        installment_1_value REAL DEFAULT 0,

        -- Installment 2
        installment_2_status TEXT DEFAULT 'PENDING',
        installment_2_due_date DATETIME,
        installment_2_received_date DATETIME,
        installment_2_value REAL DEFAULT 0,

        -- Installment 3
        installment_3_status TEXT DEFAULT 'PENDING',
        installment_3_due_date DATETIME,
        installment_3_received_date DATETIME,
        installment_3_value REAL DEFAULT 0,

        -- Installment 4
        installment_4_status TEXT DEFAULT 'PENDING',
        installment_4_due_date DATETIME,
        installment_4_received_date DATETIME,
        installment_4_value REAL DEFAULT 0,

        -- Metadata
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      -- Indexes for sales
      CREATE INDEX IF NOT EXISTS idx_sales_tenant_status
        ON sales(tenant_id, consistency_status);
      CREATE INDEX IF NOT EXISTS idx_sales_seller
        ON sales(tenant_id, seller_id);
      CREATE INDEX IF NOT EXISTS idx_sales_deal
        ON sales(deal_id);

      -- Custom Field Definitions table
      CREATE TABLE IF NOT EXISTS custom_field_definitions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        scope TEXT NOT NULL,
        options TEXT DEFAULT '[]',
        required BOOLEAN DEFAULT 0,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Integrations table
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'DISCONNECTED',
        config TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      
    `);
  }
  return dbInstance;
}

/**
 * Get the database instance.
 */
export function getDatabase(): Database.Database {
  return initDb();
}

export const getDb = getDatabase;

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export const closeDb = closeDatabase;

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
