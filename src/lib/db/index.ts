import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(process.cwd(), 'data', 'database.db');

let dbInstance: Database.Database | null = null;

/**
 * Initialize the database connection and create tables if they don't exist
 */
export function initDb(): Database.Database {
  if (!dbInstance) {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbInstance = new Database(dbPath);

    // Enable WAL mode for better concurrency
    dbInstance.pragma('journal_mode = WAL');

    // Create tables if they don't exist
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
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
        user_id TEXT NOT NULL,
        widget_type TEXT NOT NULL,
        data TEXT,
        position INTEGER DEFAULT 0,
        size TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Regions table
      CREATE TABLE IF NOT EXISTS regions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- PDVs table
      CREATE TABLE IF NOT EXISTS pdvs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        region_id TEXT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'PHYSICAL_STORE',
        address TEXT,
        city TEXT,
        state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        region_id TEXT,
        pdv_id TEXT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'PJ',
        document TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'LEAD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        pdv_id TEXT,
        name TEXT NOT NULL,
        sku TEXT,
        price REAL DEFAULT 0,
        attributes TEXT,
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
        type TEXT DEFAULT 'OPEN',
        order_val INTEGER DEFAULT 0,
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
        pdv_id TEXT,
        product_id TEXT,
        stage_id TEXT NOT NULL,
        title TEXT NOT NULL,
        value REAL DEFAULT 0,
        product_ids TEXT,
        tags TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (pdv_id) REFERENCES pdvs(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE
      );

      -- Custom Field Definitions table
      CREATE TABLE IF NOT EXISTS custom_field_definitions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        entity TEXT NOT NULL,
        field_key TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        options TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, entity, field_key),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Integrations table
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'DISCONNECTED',
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      -- Widgets table
      CREATE TABLE IF NOT EXISTS widgets (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
    `);
  }
  return dbInstance;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  return initDb();
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Execute a query that doesn't return results
 */
export function executeQuery(sql: string, params?: any[]): void {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.run(params || []);
}

/**
 * Execute a query that returns a single row
 */
export function getOneQuery<T>(sql: string, params?: any[]): T | null {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  const result = stmt.get(params || []);
  return (result as T | undefined) || null;
}

/**
 * Execute a query that returns multiple rows
 */
export function getQuery<T>(sql: string, params?: any[]): T[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  return stmt.all(params || []) as T[];
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Define interfaces for database records
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  refresh_token: string;
  expires_at: string;
  revoked_at: string | null;
  user_id: string;
  created_at: string;
}

// Authentication-related functions
export function getUserByEmail(email: string): User | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT
      id,
      email,
      password_hash,
      name,
      role,
      is_active as active,
      tenant_id,
      created_at,
      updated_at
    FROM users WHERE email = ?
  `).get(email);
  return (result as User | undefined) || null;
}

export function getUserByEmailAndTenantId(email: string, tenantId: string): User | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT
      id,
      email,
      password_hash,
      name,
      role,
      is_active as active,
      tenant_id,
      created_at,
      updated_at
    FROM users WHERE email = ? AND tenant_id = ?
  `).get(email, tenantId);
  return (result as User | undefined) || null;
}

export function getUserById(id: string): User | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT
      id,
      email,
      password_hash,
      name,
      role,
      is_active as active,
      tenant_id,
      created_at,
      updated_at
    FROM users WHERE id = ?
  `).get(id);
  return (result as User | undefined) || null;
}

export function getTenantById(id: string): Tenant | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
  return (result as Tenant | undefined) || null;
}

export function getTenantBySlug(slug: string): Tenant | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug);
  return (result as Tenant | undefined) || null;
}

export function createTenant(name: string, slug: string): Tenant {
  const db = getDatabase();
  const id = generateId();
  db.prepare('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
  return getTenantById(id)!;
}

export function createUser(email: string, passwordHash: string, name: string, role: string, tenantId: string): User {
  const db = getDatabase();
  const id = generateId();
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, is_active, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, email, passwordHash, name, role, 1, tenantId
  );
  return getUserById(id)!;
}

export function createSession(userId: string, refreshToken: string, expiresAt: string): void {
  const db = getDatabase();
  const id = generateId();
  db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)').run(
    id, userId, refreshToken, expiresAt
  );
}

export function getSessionByRefreshToken(refreshToken: string): Session | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM sessions WHERE refresh_token = ?').get(refreshToken);
  return (result as Session | undefined) || null;
}

export function revokeSession(refreshToken: string): void {
  const db = getDatabase();
  db.prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE refresh_token = ?').run(refreshToken);
}

export function deleteExpiredSessions(): void {
  const db = getDatabase();
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL").run();
}

export function getSessionsByUserId(userId: string): Session[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Session[];
}

export function deleteAllUserSessions(userId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// Preferences functions
export interface Preference {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function getPreferencesByUserId(userId: string): Preference[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM preferences WHERE user_id = ?').all(userId) as Preference[];
}

export function getPreference(userId: string, key: string): Preference | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM preferences WHERE user_id = ? AND key = ?').get(userId, key);
  return (result as Preference | undefined) || null;
}

export function createOrUpdatePreference(userId: string, key: string, value: string): void {
  const db = getDatabase();
  const existing = getPreference(userId, key);
  if (existing) {
    db.prepare('UPDATE preferences SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(value, existing.id);
  } else {
    const id = generateId();
    db.prepare('INSERT INTO preferences (id, user_id, key, value) VALUES (?, ?, ?, ?)').run(id, userId, key, value);
  }
}

// Dashboard Widgets functions
export interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  data: string;
  position: number;
  size: string;
  created_at: string;
  updated_at: string;
}

export function getWidgetsByUserId(userId: string): DashboardWidget[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position ASC').all(userId) as DashboardWidget[];
}

export function getWidgetById(id: string): DashboardWidget | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM dashboard_widgets WHERE id = ?').get(id);
  return (result as DashboardWidget | undefined) || null;
}

export function createWidget(userId: string, widgetType: string, data: string, position: number, size: string): DashboardWidget {
  const db = getDatabase();
  const id = generateId();
  db.prepare('INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, userId, widgetType, data, position, size
  );
  return getWidgetById(id)!;
}

export { getDatabase as getDb, closeDatabase as closeDb };