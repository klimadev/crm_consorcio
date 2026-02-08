import { executeQuery as runQuery, getQuery, getOneQuery, generateId, getDatabase } from './client';
import bcrypt from 'bcryptjs';
import type { Tenant, User, Region, PDV, Customer, Product, PipelineStage, Tag, Deal, Integration, CustomFieldDefinition, DashboardWidget, Preference, Session } from './schema';

export function createDefaultTenantIfNotExists() {
  const existing = getOneQuery<any>('SELECT id FROM tenants WHERE slug = ?', ['default']);
  if (existing) {
    return existing.id;
  }
  
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, 'MC Investimentos (Demo)', 'default', now, now]);
  
  return id;
}

function hasTenantData(tenantId: string): boolean {
  const count = getOneQuery<any>('SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?', [tenantId]);
  return (count?.cnt ?? 0) > 0;
}

export function seedDefaultTenantData() {
  const tenantId = createDefaultTenantIfNotExists();
  
  if (hasTenantData(tenantId)) {
    console.log('Tenant data already exists, skipping seed');
    return tenantId;
  }
  
  seedTenantData(tenantId);
  return tenantId;
}

export function createTenant(name: string, slug: string): Tenant {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, name, slug, now, now]);
  
  return { id, name, slug, created_at: now, updated_at: now };
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return await getOneQuery<Tenant>('SELECT * FROM tenants WHERE slug = ?', [slug]);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  return await getOneQuery<Tenant>('SELECT * FROM tenants WHERE id = ?', [id]);
}

export async function getTenant(id: string): Promise<Tenant | null> {
  return await getOneQuery<Tenant>('SELECT * FROM tenants WHERE id = ?', [id]);
}

export function createUser(
  tenantId: string,
  email: string,
  password: string,
  name: string,
  role: User['role'] = 'SALES_REP',
  pdvId: string | null = null
): User {
  const id = generateId();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO users (id, tenant_id, email, password_hash, name, role, pdv_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [id, tenantId, email, passwordHash, name, role, pdvId, now, now]);
  
  return {
    id,
    tenant_id: tenantId,
    email,
    password_hash: passwordHash,
    name,
    role,
    pdv_id: pdvId,
    active: true,
    created_at: now,
    updated_at: now
  };
}

export async function getUserByEmail(email: string): Promise<(User & { tenant_slug: string }) | null> {
  const row = await getOneQuery<any>(`
    SELECT u.*, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email = ?
  `, [email]);
  return row || null;
}

export async function getUserByEmailAndTenantId(email: string, tenantId: string): Promise<User | null> {
  const row = await getOneQuery<User>(`
    SELECT
      id,
      email,
      password_hash,
      name,
      role,
      is_active as active,
      tenant_id,
      pdv_id,
      created_at,
      updated_at
    FROM users WHERE email = ? AND tenant_id = ?
  `, [email, tenantId]);
  if (!row || !row.password_hash) return null;
  return row;
}

export function getUserById(id: string): (User & { tenant_slug: string }) | null {
  const row = getOneQuery<any>(`
    SELECT 
      u.id,
      u.email,
      u.password_hash,
      u.name,
      u.role,
      u.is_active as active,
      u.is_active,
      u.tenant_id,
      u.pdv_id,
      u.created_at,
      u.updated_at,
      t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ?
  `, [id]);

  if (!row) return null;

  return {
    ...row,
    // Normalize to boolean to match the User interface expectations
    active: Boolean(row.active ?? row.is_active),
  };
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  return await getQuery<User>(`
    SELECT
      id,
      email,
      password_hash,
      name,
      role,
      is_active as active,
      tenant_id,
      pdv_id,
      created_at,
      updated_at
    FROM users WHERE tenant_id = ? ORDER BY name
  `, [tenantId]);
}

export function createSession(userId: string, refreshToken: string, expiresAt: string): void {
  const id = generateId();
  runQuery('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)', [
    id, userId, refreshToken, expiresAt
  ]);
}

export function getSessionByRefreshToken(refreshToken: string): Session | null {
  return getOneQuery<Session>('SELECT * FROM sessions WHERE refresh_token = ?', [refreshToken]);
}

export function revokeSession(refreshToken: string): void {
  runQuery('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE refresh_token = ?', [refreshToken]);
}

export function deleteExpiredSessions(): void {
  runQuery("DELETE FROM sessions WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL");
}

export function getSessionsByUserId(userId: string): Session[] {
  return getQuery<Session>('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export function deleteAllUserSessions(userId: string): void {
  runQuery('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export function getPreferencesByUserId(userId: string): Preference[] {
  return getQuery<Preference>('SELECT * FROM preferences WHERE user_id = ?', [userId]);
}

export function getPreference(userId: string, key: string): Preference | null {
  return getOneQuery<Preference>('SELECT * FROM preferences WHERE user_id = ? AND key = ?', [userId, key]);
}

export function createOrUpdatePreference(userId: string, key: string, value: string): void {
  const existing = getPreference(userId, key);
  if (existing) {
    runQuery('UPDATE preferences SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, existing.id]);
  } else {
    const id = generateId();
    runQuery('INSERT INTO preferences (id, user_id, key, value) VALUES (?, ?, ?, ?)', [id, userId, key, value]);
  }
}

export function upsertPreference(userId: string, key: string, value: string): void {
  createOrUpdatePreference(userId, key, value);
}

export function deletePreference(userId: string, key: string): void {
  runQuery('DELETE FROM preferences WHERE user_id = ? AND key = ?', [userId, key]);
}

const ALLOWED_USER_FIELDS = ['name', 'email', 'role', 'pdv_id', 'active', 'password_hash'];
const ALLOWED_CUSTOMER_FIELDS = ['type', 'name', 'document', 'email', 'phone', 'zip_code', 'status', 'pdv_ids', 'assigned_employee_ids', 'custom_values'];
const ALLOWED_DEAL_FIELDS = ['title', 'pdv_id', 'customer_id', 'customer_name', 'value', 'stage_id', 'visibility', 'assigned_employee_ids', 'product_ids', 'custom_values', 'tags', 'notes', 'next_follow_up_date'];
const ALLOWED_PRODUCT_FIELDS = ['name', 'description', 'category', 'base_price', 'attributes', 'form_schema', 'automation_steps', 'default_follow_up_days', 'active'];
const ALLOWED_STAGE_FIELDS = ['name', 'color', 'type', 'automation_steps', 'order_index'];
const ALLOWED_REGION_FIELDS = ['name'];
const ALLOWED_PDV_FIELDS = ['name', 'type', 'region_id', 'location', 'is_active'];
const ALLOWED_TAG_FIELDS = ['label', 'color'];
const ALLOWED_INTEGRATION_FIELDS = ['name', 'type', 'status', 'config'];
const ALLOWED_CUSTOM_FIELD_FIELDS = ['key', 'label', 'type', 'scope', 'options', 'required', 'active'];
const ALLOWED_WIDGET_FIELDS = ['type', 'title', 'col_span', 'config', 'user_id'];

function safeJsonParse<T>(str: string, fallback: T, maxDepth = 10): T {
  try {
    const parsed = JSON.parse(str);
    const checkDepth = (obj: any, depth: number): any => {
      if (depth > maxDepth) return null;
      if (Array.isArray(obj)) return obj.map((item) => checkDepth(item, depth + 1));
      if (obj && typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key of Object.keys(obj)) {
          const value = checkDepth(obj[key], depth + 1);
          if (value !== null) result[key] = value;
        }
        return result;
      }
      return obj;
    };
    return checkDepth(parsed, 0) || fallback;
  } catch {
    return fallback;
  }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const now = new Date().toISOString();

  const filtered = Object.entries(data).filter(([key, value]) =>
    ALLOWED_USER_FIELDS.includes(key) && key !== 'id' && key !== 'tenant_id' && key !== 'created_at'
  );

  if (filtered.length === 0) return await getUserById(id);

  // Map 'active' field to 'is_active' for database update
  const mappedFields = filtered.map(([key]) => {
    // Map TypeScript interface field name to database column name
    const dbFieldName = key === 'active' ? 'is_active' : key;
    return `${dbFieldName} = ?`;
  });

  const values = filtered.map(([, value]) => value);

  values.push(now);
  values.push(id);

  await runQuery(`UPDATE users SET ${mappedFields.join(', ')}, updated_at = ? WHERE id = ?`, values);

  return await getUserById(id);
}

export function deleteUser(id: string): void {
  runQuery('DELETE FROM users WHERE id = ?', [id]);
}

export function createRegion(tenantId: string, name: string): Region {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO regions (id, tenant_id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, tenantId, name, now, now]);
  
  return { id, tenant_id: tenantId, name, created_at: now, updated_at: now };
}

export async function getRegionsByTenant(tenantId: string): Promise<Region[]> {
  return await getQuery<Region>('SELECT * FROM regions WHERE tenant_id = ? ORDER BY name', [tenantId]);
}

export function deleteRegion(id: string): void {
  runQuery('DELETE FROM regions WHERE id = ?', [id]);
}

export function createPDV(
  tenantId: string,
  name: string,
  type: PDV['type'],
  regionId: string,
  location: string
): PDV {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO pdvs (id, tenant_id, name, type, region_id, location, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [id, tenantId, name, type, regionId, location, now, now]);
  
  return { id, tenant_id: tenantId, name, type, region_id: regionId, location, is_active: true, created_at: now, updated_at: now };
}

export function getPDVsByTenant(tenantId: string): PDV[] {
  return getQuery<PDV>('SELECT * FROM pdvs WHERE tenant_id = ? ORDER BY name', [tenantId]);
}

export function updatePDV(
  id: string,
  name: string,
  regionId: string | null,
  type: string,
  location: string
): PDV | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE pdvs SET name = ?, region_id = ?, type = ?, location = ?, updated_at = ? WHERE id = ?
  `, [name, regionId, type, location, now, id]);

  const row = getOneQuery<PDV>('SELECT * FROM pdvs WHERE id = ?', [id]);
  return row;
}

export function deletePDV(id: string): void {
  runQuery('DELETE FROM pdvs WHERE id = ?', [id]);
}

export function createCustomer(
  tenantId: string,
  name: string,
  type: string,
  document: string,
  email: string,
  phone: string,
  status: string,
  regionId?: string | null,
  pdvId?: string | null
): Customer {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(`
    INSERT INTO customers (id, tenant_id, region_id, pdv_id, name, type, document, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, regionId, pdvId, name, type, document, email, phone, status, now, now
  ]);

  return {
    id,
    tenant_id: tenantId,
    region_id: regionId ?? null,
    pdv_id: pdvId ?? null,
    name,
    type: type as 'PF' | 'PJ',
    document,
    email,
    phone,
    zip_code: '',
    status: status as 'LEAD' | 'PROPONENT' | 'PENDING' | 'ACTIVE' | 'DEFAULTING' | 'CHURN',
    pdv_ids: '[]',
    assigned_employee_ids: '[]',
    custom_values: '{}',
    created_at: now,
    updated_at: now
  };
}

export function getCustomersByTenant(tenantId: string): Customer[] {
  const rows = getQuery<any>('SELECT * FROM customers WHERE tenant_id = ? ORDER BY name', [tenantId]);
  return rows.map(row => ({
    ...row,
    pdv_ids: safeJsonParse(row.pdv_ids || '[]', []),
    assigned_employee_ids: safeJsonParse(row.assigned_employee_ids || '[]', []),
    custom_values: safeJsonParse(row.custom_values || '{}', {})
  }));
}

export function updateCustomer(
  id: string,
  name: string,
  type: string,
  document: string,
  email: string,
  phone: string,
  status: string,
  regionId?: string | null,
  pdvId?: string | null
): Customer | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE customers SET name = ?, type = ?, document = ?, email = ?, phone = ?, status = ?, region_id = ?, pdv_id = ?, updated_at = ? WHERE id = ?
  `, [name, type, document, email, phone, status, regionId, pdvId, now, id]);

  const row = getOneQuery<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  return row;
}

export function deleteCustomer(id: string): void {
  runQuery('DELETE FROM customers WHERE id = ?', [id]);
}

export function createProduct(
  tenantId: string,
  data: Omit<Product, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Product {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO products (id, tenant_id, name, description, category, base_price, attributes, form_schema, automation_steps, default_follow_up_days, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.name, data.description || '', data.category || '', data.base_price || 0,
    JSON.stringify(data.attributes || []), JSON.stringify(data.form_schema || []),
    JSON.stringify(data.automation_steps || []), data.default_follow_up_days || null, data.active ? 1 : 0,
    now, now
  ]);
  
  return {
    id,
    tenant_id: tenantId,
    ...data,
    attributes: JSON.stringify(data.attributes || []),
    form_schema: JSON.stringify(data.form_schema || []),
    automation_steps: JSON.stringify(data.automation_steps || []),
    created_at: now,
    updated_at: now
  };
}

export function getProductsByTenant(tenantId: string): Product[] {
  const rows = getQuery<any>('SELECT * FROM products WHERE tenant_id = ? ORDER BY name', [tenantId]);
  return rows.map(row => ({
    ...row,
    attributes: JSON.parse(row.attributes || '[]'),
    form_schema: JSON.parse(row.form_schema || '[]'),
    automation_steps: JSON.parse(row.automation_steps || '[]')
  }));
}

export function updateProduct(
  id: string,
  name: string,
  sku: string,
  price: number,
  attributes: string,
  pdvId: string | null
): Product | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE products SET name = ?, sku = ?, price = ?, attributes = ?, pdv_id = ?, updated_at = ? WHERE id = ?
  `, [name, sku, price, attributes, pdvId, now, id]);

  const row = getOneQuery<any>('SELECT * FROM products WHERE id = ?', [id]);
  if (!row) return null;

  return {
    ...row,
    attributes: JSON.parse(row.attributes || '[]'),
    form_schema: JSON.parse(row.form_schema || '[]'),
    automation_steps: JSON.parse(row.automation_steps || '[]')
  };
}

export function deleteProduct(id: string): void {
  runQuery('DELETE FROM products WHERE id = ?', [id]);
}

export function createPipelineStage(
  tenantId: string,
  data: Omit<PipelineStage, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): PipelineStage {
  const id = generateId();
  const now = new Date().toISOString();
  
  const maxOrderResult = getOneQuery<{ 'COALESCE(MAX(order_index), -1)': number }>(
    'SELECT COALESCE(MAX(order_index), -1) FROM pipeline_stages WHERE tenant_id = ?', 
    [tenantId]
  );
  const maxOrder = maxOrderResult?.['COALESCE(MAX(order_index), -1)'] ?? -1;
  
  runQuery(`
    INSERT INTO pipeline_stages (id, tenant_id, name, color, type, automation_steps, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.name, data.color, data.type,
    JSON.stringify(data.automation_steps || []), maxOrder + 1,
    now, now
  ]);
  
  return {
    id,
    tenant_id: tenantId,
    ...data,
    automation_steps: JSON.stringify(data.automation_steps || []),
    order_index: maxOrder + 1,
    created_at: now,
    updated_at: now
  };
}

export function getPipelineStagesByTenant(tenantId: string): PipelineStage[] {
  const rows = getQuery<any>('SELECT * FROM pipeline_stages WHERE tenant_id = ? ORDER BY order_index', [tenantId]);
  return rows.map(row => ({
    ...row,
    automation_steps: JSON.parse(row.automation_steps || '[]')
  }));
}

export function updatePipelineStage(
  id: string,
  name: string,
  type: string,
  orderIndex: number
): PipelineStage | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE pipeline_stages SET name = ?, type = ?, order_index = ?, updated_at = ? WHERE id = ?
  `, [name, type, orderIndex, now, id]);

  const row = getOneQuery<any>('SELECT * FROM pipeline_stages WHERE id = ?', [id]);
  if (!row) return null;

  return {
    ...row,
    automation_steps: JSON.parse(row.automation_steps || '[]')
  };
}

export function deletePipelineStage(id: string): void {
  runQuery('DELETE FROM pipeline_stages WHERE id = ?', [id]);
}

export function reorderPipelineStages(tenantId: string, stageIds: string[]): void {
  const now = new Date().toISOString();
  stageIds.forEach((id, index) => {
    runQuery('UPDATE pipeline_stages SET order_index = ?, updated_at = ? WHERE id = ?', [index, now, id]);
  });
}

export function createTag(tenantId: string, label: string, color: string): Tag {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, tenantId, label, color, now, now]);
  
  return { id, tenant_id: tenantId, label, color, created_at: now, updated_at: now };
}

export function getTagsByTenant(tenantId: string): Tag[] {
  return getQuery<Tag>('SELECT * FROM tags WHERE tenant_id = ? ORDER BY label', [tenantId]);
}

export function deleteTag(id: string): void {
  runQuery('DELETE FROM tags WHERE id = ?', [id]);
}

export function createDeal(
  tenantId: string,
  title: string,
  value: number,
  stageId: string,
  customerId: string | null,
  pdvId: string | null,
  productId: string | null,
  productIds: string,
  tags: string,
  notes: string
): Deal {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(`
    INSERT INTO deals (id, tenant_id, title, value, stage_id, customer_id, pdv_id, product_id, product_ids, tags, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, title, value, stageId, customerId, pdvId, productId, productIds, tags, notes, now, now
  ]);

  return {
    id,
    tenant_id: tenantId,
    title,
    value,
    stage_id: stageId,
    customer_id: customerId,
    pdv_id: pdvId,
    customer_name: '',
    visibility: 'PUBLIC',
    assigned_employee_ids: '[]',
    product_ids: productIds,
    custom_values: '{}',
    tags,
    notes,
    next_follow_up_date: null,
    created_at: now,
    updated_at: now
  };
}

export function getDealsByTenant(tenantId: string): Deal[] {
  const rows = getQuery<any>('SELECT * FROM deals WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
  return rows.map(row => ({
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  }));
}

export type CommercialPeriod = 'month' | 'year' | 'last_30_days' | 'last_90_days';

export interface CommercialDashboardFilters {
  year?: number;
  month?: number | null;
  period?: CommercialPeriod;
  regionId?: string;
  pdvId?: string;
  managerId?: string;
  sellerId?: string;
}

export interface CommercialRankingEntry {
  employeeId: string;
  name: string;
  role: User['role'];
  pdvId: string | null;
  totalValue: number;
  wonDeals: number;
  avgTicket: number;
}

export interface CommercialDashboardSnapshot {
  periodStart: string;
  periodEnd: string;
  totalSalesCount: number;
  totalSalesValue: number;
  avgTicket: number;
  monthlyComparisonPct: number;
  yearlyQuotaCount: number;
  yearlyCreditValue: number;
  yearlyAvgTicket: number;
  yearlyComparisonPct: number;
  evolutionSeries: Array<{ label: string; value: number; count: number }>;
  weekdaySeries: Array<{ weekday: number; label: string; value: number; count: number }>;
  pdvRevenueSeries: Array<{ pdvId: string | null; pdvName: string; value: number; count: number }>;
  ranking: {
    sellers: CommercialRankingEntry[];
    managers: CommercialRankingEntry[];
  };
  insuranceBreakdown: {
    withInsurance: number;
    withoutInsurance: number;
    withInsuranceValue: number;
    withoutInsuranceValue: number;
  };
}

interface DateWindow {
  start: string;
  end: string;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthDateWindow(year: number, month: number): DateWindow {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start: toISODate(start), end: toISODate(end) };
}

function getYearDateWindow(year: number): DateWindow {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function getRollingDateWindow(days: number): DateWindow {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
}

function resolveDateWindow(filters: CommercialDashboardFilters, fallbackYear: number, fallbackMonth: number): DateWindow {
  const year = filters.year ?? fallbackYear;
  const month = filters.month ?? fallbackMonth;
  const period = filters.period ?? 'month';

  if (period === 'last_90_days') return getRollingDateWindow(90);
  if (period === 'last_30_days') return getRollingDateWindow(30);
  if (period === 'year') return getYearDateWindow(year);
  return getMonthDateWindow(year, month);
}

function parseEmployeeIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

function hasInsuranceValue(raw: string): boolean {
  const parsed = safeJsonParse<Record<string, unknown>>(raw || '{}', {});
  const candidateKeys = ['insurance', 'seguro', 'hasInsurance', 'comSeguro'];

  for (const key of candidateKeys) {
    const value = parsed[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'sim', 'yes', 'com', 'ativo'].includes(normalized)) return true;
      if (['false', '0', 'nao', 'não', 'sem', 'no'].includes(normalized)) return false;
    }
  }

  return false;
}

function resolveManagerPdvId(tenantId: string, managerId?: string): string | null {
  if (!managerId) return null;
  const manager = getOneQuery<{ pdv_id: string | null }>(
    'SELECT pdv_id FROM users WHERE tenant_id = ? AND id = ? AND role = ?',
    [tenantId, managerId, 'MANAGER']
  );
  return manager?.pdv_id ?? null;
}

function buildWonDealsWhere(
  tenantId: string,
  filters: CommercialDashboardFilters,
  extra: { year?: number; month?: number; window?: DateWindow } = {}
): { sql: string; params: Array<string | number> } {
  const managerPdvId = resolveManagerPdvId(tenantId, filters.managerId);
  const clauses = ['d.tenant_id = ?', `s.type = 'WON'`];
  const params: Array<string | number> = [tenantId];

  if (filters.regionId) {
    clauses.push('p.region_id = ?');
    params.push(filters.regionId);
  }

  if (filters.pdvId) {
    clauses.push('d.pdv_id = ?');
    params.push(filters.pdvId);
  } else if (managerPdvId) {
    clauses.push('d.pdv_id = ?');
    params.push(managerPdvId);
  }

  if (filters.sellerId) {
    clauses.push('d.assigned_employee_ids LIKE ?');
    params.push(`%\"${filters.sellerId}\"%`);
  }

  if (extra.year !== undefined) {
    clauses.push(`CAST(strftime('%Y', d.created_at) AS INTEGER) = ?`);
    params.push(extra.year);
  }

  if (extra.month !== undefined) {
    clauses.push(`CAST(strftime('%m', d.created_at) AS INTEGER) = ?`);
    params.push(extra.month);
  }

  if (extra.window) {
    clauses.push('date(d.created_at) BETWEEN date(?) AND date(?)');
    params.push(extra.window.start, extra.window.end);
  }

  return { sql: clauses.join(' AND '), params };
}

function getSalesTotals(tenantId: string, filters: CommercialDashboardFilters, extra: { year?: number; month?: number; window?: DateWindow } = {}) {
  const base = buildWonDealsWhere(tenantId, filters, extra);
  return getOneQuery<{ totalValue: number | null; totalCount: number | null }>(
    `
      SELECT COALESCE(SUM(d.value), 0) AS totalValue, COUNT(*) AS totalCount
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id AND s.tenant_id = d.tenant_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${base.sql}
    `,
    base.params
  ) ?? { totalValue: 0, totalCount: 0 };
}

export function getCommercialDashboardSnapshot(
  tenantId: string,
  filters: CommercialDashboardFilters = {}
): CommercialDashboardSnapshot {
  const now = new Date();
  const selectedYear = filters.year ?? now.getFullYear();
  const selectedMonth = filters.month ?? now.getMonth() + 1;
  const selectedWindow = resolveDateWindow(filters, selectedYear, selectedMonth);

  const currentMonthTotals = getSalesTotals(tenantId, filters, { year: selectedYear, month: selectedMonth });
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const previousMonthTotals = getSalesTotals(tenantId, filters, { year: prevMonthYear, month: prevMonth });

  const yearlyTotals = getSalesTotals(tenantId, filters, { year: selectedYear });
  const previousYearTotals = getSalesTotals(tenantId, filters, { year: selectedYear - 1 });
  const selectedWindowTotals = getSalesTotals(tenantId, filters, { window: selectedWindow });

  const monthlyComparisonPct = (previousMonthTotals.totalValue ?? 0) > 0
    ? (((currentMonthTotals.totalValue ?? 0) - (previousMonthTotals.totalValue ?? 0)) / (previousMonthTotals.totalValue ?? 0)) * 100
    : 0;
  const yearlyComparisonPct = (previousYearTotals.totalValue ?? 0) > 0
    ? (((yearlyTotals.totalValue ?? 0) - (previousYearTotals.totalValue ?? 0)) / (previousYearTotals.totalValue ?? 0)) * 100
    : 0;

  const baseWhere = buildWonDealsWhere(tenantId, filters, { window: selectedWindow });
  const evolutionSeries = getQuery<{ label: string; value: number; count: number }>(
    `
      SELECT strftime('%Y-%m-%d', d.created_at) AS label,
             COALESCE(SUM(d.value), 0) AS value,
             COUNT(*) AS count
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id AND s.tenant_id = d.tenant_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${baseWhere.sql}
      GROUP BY strftime('%Y-%m-%d', d.created_at)
      ORDER BY label ASC
    `,
    baseWhere.params
  );

  const weekDayRows = getQuery<{ weekday: number; value: number; count: number }>(
    `
      SELECT CAST(strftime('%w', d.created_at) AS INTEGER) AS weekday,
             COALESCE(SUM(d.value), 0) AS value,
             COUNT(*) AS count
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id AND s.tenant_id = d.tenant_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${baseWhere.sql}
      GROUP BY CAST(strftime('%w', d.created_at) AS INTEGER)
      ORDER BY weekday ASC
    `,
    baseWhere.params
  );

  const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const weekdaySeries = Array.from({ length: 7 }, (_, weekday) => {
    const found = weekDayRows.find((row) => row.weekday === weekday);
    return {
      weekday,
      label: weekdayLabels[weekday],
      value: found?.value ?? 0,
      count: found?.count ?? 0,
    };
  });

  const pdvRevenueSeries = getQuery<{ pdvId: string | null; pdvName: string; value: number; count: number }>(
    `
      SELECT d.pdv_id AS pdvId,
             COALESCE(p.name, 'Sem PDV') AS pdvName,
             COALESCE(SUM(d.value), 0) AS value,
             COUNT(*) AS count
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id AND s.tenant_id = d.tenant_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${baseWhere.sql}
      GROUP BY d.pdv_id, p.name
      ORDER BY value DESC
    `,
    baseWhere.params
  );

  const periodRows = getQuery<{ value: number; assigned_employee_ids: string; custom_values: string; pdv_id: string | null }>(
    `
      SELECT d.value, d.assigned_employee_ids, d.custom_values, d.pdv_id
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id AND s.tenant_id = d.tenant_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${baseWhere.sql}
    `,
    baseWhere.params
  );

  const employees = getQuery<{ id: string; name: string; role: User['role']; pdv_id: string | null }>(
    'SELECT id, name, role, pdv_id FROM users WHERE tenant_id = ? AND is_active = 1',
    [tenantId]
  );
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const sellerAgg = new Map<string, { value: number; count: number }>();
  const managerAgg = new Map<string, { value: number; count: number }>();
  const managersByPdv = new Map<string, string>();

  employees
    .filter((employee) => employee.role === 'MANAGER' && employee.pdv_id)
    .forEach((manager) => {
      if (manager.pdv_id) managersByPdv.set(manager.pdv_id, manager.id);
    });

  let withInsurance = 0;
  let withoutInsurance = 0;
  let withInsuranceValue = 0;
  let withoutInsuranceValue = 0;

  periodRows.forEach((deal) => {
    const value = Number(deal.value) || 0;
    const employeeIds = parseEmployeeIds(deal.assigned_employee_ids);
    const countedSellers = new Set<string>();

    employeeIds.forEach((employeeId) => {
      const employee = employeeMap.get(employeeId);
      if (!employee || employee.role !== 'SALES_REP' || countedSellers.has(employeeId)) return;
      const current = sellerAgg.get(employeeId) ?? { value: 0, count: 0 };
      sellerAgg.set(employeeId, { value: current.value + value, count: current.count + 1 });
      countedSellers.add(employeeId);
    });

    const managerId = deal.pdv_id ? managersByPdv.get(deal.pdv_id) : undefined;
    if (managerId) {
      const current = managerAgg.get(managerId) ?? { value: 0, count: 0 };
      managerAgg.set(managerId, { value: current.value + value, count: current.count + 1 });
    }

    if (hasInsuranceValue(deal.custom_values)) {
      withInsurance += 1;
      withInsuranceValue += value;
    } else {
      withoutInsurance += 1;
      withoutInsuranceValue += value;
    }
  });

  const toRankingEntry = (
    employeeId: string,
    role: User['role'],
    aggregate: { value: number; count: number }
  ): CommercialRankingEntry | null => {
    const employee = employeeMap.get(employeeId);
    if (!employee || employee.role !== role) return null;
    return {
      employeeId: employee.id,
      name: employee.name,
      role: employee.role,
      pdvId: employee.pdv_id,
      totalValue: aggregate.value,
      wonDeals: aggregate.count,
      avgTicket: aggregate.count > 0 ? aggregate.value / aggregate.count : 0,
    };
  };

  const sellers = Array.from(sellerAgg.entries())
    .map(([employeeId, aggregate]) => toRankingEntry(employeeId, 'SALES_REP', aggregate))
    .filter((item): item is CommercialRankingEntry => Boolean(item))
    .sort((a, b) => b.totalValue - a.totalValue);

  const managers = Array.from(managerAgg.entries())
    .map(([employeeId, aggregate]) => toRankingEntry(employeeId, 'MANAGER', aggregate))
    .filter((item): item is CommercialRankingEntry => Boolean(item))
    .sort((a, b) => b.totalValue - a.totalValue);

  return {
    periodStart: selectedWindow.start,
    periodEnd: selectedWindow.end,
    totalSalesCount: selectedWindowTotals.totalCount ?? 0,
    totalSalesValue: selectedWindowTotals.totalValue ?? 0,
    avgTicket: (selectedWindowTotals.totalCount ?? 0) > 0
      ? (selectedWindowTotals.totalValue ?? 0) / (selectedWindowTotals.totalCount ?? 0)
      : 0,
    monthlyComparisonPct,
    yearlyQuotaCount: yearlyTotals.totalCount ?? 0,
    yearlyCreditValue: yearlyTotals.totalValue ?? 0,
    yearlyAvgTicket: (yearlyTotals.totalCount ?? 0) > 0
      ? (yearlyTotals.totalValue ?? 0) / (yearlyTotals.totalCount ?? 0)
      : 0,
    yearlyComparisonPct,
    evolutionSeries,
    weekdaySeries,
    pdvRevenueSeries,
    ranking: { sellers, managers },
    insuranceBreakdown: {
      withInsurance,
      withoutInsurance,
      withInsuranceValue,
      withoutInsuranceValue,
    },
  };
}

export function updateDeal(
  id: string,
  title: string,
  value: number,
  stageId: string,
  customerId: string | null,
  pdvId: string | null,
  productId: string | null,
  productIds: string,
  tags: string,
  notes: string
): Deal | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE deals SET title = ?, value = ?, stage_id = ?, customer_id = ?, pdv_id = ?, product_id = ?, product_ids = ?, tags = ?, notes = ?, updated_at = ? WHERE id = ?
  `, [title, value, stageId, customerId, pdvId, productId, productIds, tags, notes, now, id]);

  const row = getOneQuery<any>('SELECT * FROM deals WHERE id = ?', [id]);
  if (!row) return null;

  return {
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  };
}

export function deleteDeal(id: string): void {
  runQuery('DELETE FROM deals WHERE id = ?', [id]);
}

export function createIntegration(
  tenantId: string,
  name: string,
  type: string,
  status: Integration['status'] = 'DISCONNECTED'
): Integration {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO integrations (id, tenant_id, name, type, status, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, tenantId, name, type, status, '{}', now, now]);
  
  return { id, tenant_id: tenantId, name, type, status, config: '{}', created_at: now, updated_at: now };
}

export function getIntegrationsByTenant(tenantId: string): Integration[] {
  const rows = getQuery<any>('SELECT * FROM integrations WHERE tenant_id = ?', [tenantId]);
  return rows.map(row => ({
    ...row,
    config: JSON.parse(row.config || '{}')
  }));
}

export function updateIntegration(id: string, data: Partial<Integration>): Integration | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (key === 'config') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (fields.length === 0) {
    const row = getOneQuery<any>('SELECT * FROM integrations WHERE id = ?', [id]);
    return row ? { ...row, config: JSON.parse(row.config || '{}') } : null;
  }
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE integrations SET ${fields.join(', ')} WHERE id = ?`, values);
  
  const row = getOneQuery<any>('SELECT * FROM integrations WHERE id = ?', [id]);
  if (!row) return null;
  
  return {
    ...row,
    config: JSON.parse(row.config || '{}')
  };
}

export function createCustomFieldDefinition(
  tenantId: string,
  data: Omit<CustomFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): CustomFieldDefinition {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(`
    INSERT INTO custom_field_definitions (id, tenant_id, key, label, type, scope, options, required, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.key, data.label, data.type, data.scope,
    JSON.stringify(data.options || []), data.required ? 1 : 0, data.active ? 1 : 0,
    now, now
  ]);

  return {
    id,
    tenant_id: tenantId,
    ...data,
    options: data.options || [],
    created_at: now,
    updated_at: now
  };
}

export function getCustomFieldDefinitionsByTenant(tenantId: string): CustomFieldDefinition[] {
  const rows = getQuery<any>('SELECT * FROM custom_field_definitions WHERE tenant_id = ?', [tenantId]);
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.options || '[]')
  }));
}

export function updateCustomFieldDefinition(id: string, data: Partial<CustomFieldDefinition>): CustomFieldDefinition | null {
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (key === 'options') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    const row = getOneQuery<any>('SELECT * FROM custom_field_definitions WHERE id = ?', [id]);
    return row ? { ...row, options: JSON.parse(row.options || '[]') } : null;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  runQuery(`UPDATE custom_field_definitions SET ${fields.join(', ')} WHERE id = ?`, values);

  const row = getOneQuery<any>('SELECT * FROM custom_field_definitions WHERE id = ?', [id]);
  if (!row) return null;

  return {
    ...row,
    options: JSON.parse(row.options || '[]')
  };
}

export function deleteCustomFieldDefinition(id: string): void {
  runQuery('DELETE FROM custom_field_definitions WHERE id = ?', [id]);
}

export function createDashboardWidget(
  tenantId: string,
  data: Omit<DashboardWidget, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): DashboardWidget {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.user_id || null, data.type, data.title, data.col_span,
    JSON.stringify(data.config || {}), now, now
  ]);
  
  return {
    id,
    tenant_id: tenantId,
    user_id: data.user_id || null,
    type: data.type,
    title: data.title,
    col_span: data.col_span,
    config: JSON.stringify(data.config || {}),
    created_at: now,
    updated_at: now
  };
}

export function getDashboardWidgetsByTenant(tenantId: string, userId?: string): DashboardWidget[] {
  let query = 'SELECT * FROM dashboard_widgets WHERE tenant_id = ?';
  const params: any[] = [tenantId];
  
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  
  query += ' ORDER BY created_at';
  const rows = getQuery<any>(query, params);
  return rows.map(row => ({
    ...row,
    config: JSON.parse(row.config || '{}')
  }));
}

export function updateDashboardWidget(id: string, data: Partial<DashboardWidget>): DashboardWidget | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (key === 'config') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (fields.length === 0) {
    const row = getOneQuery<any>('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
    return row ? { ...row, config: JSON.parse(row.config || '{}') } : null;
  }
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE dashboard_widgets SET ${fields.join(', ')} WHERE id = ?`, values);
  
  const row = getOneQuery<any>('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
  if (!row) return null;
  
  return {
    ...row,
    config: JSON.parse(row.config || '{}')
  };
}

export function deleteDashboardWidget(id: string): void {
  runQuery('DELETE FROM dashboard_widgets WHERE id = ?', [id]);
}

// Missing functions for API routes
export function countEntitiesByTenant(tenantId: string): { regions: number; pdvs: number; stages: number } {
  const regions = getOneQuery<{ 'COUNT(*)': number }>('SELECT COUNT(*) FROM regions WHERE tenant_id = ?', [tenantId])?.['COUNT(*)'] ?? 0;
  const pdvs = getOneQuery<{ 'COUNT(*)': number }>('SELECT COUNT(*) FROM pdvs WHERE tenant_id = ?', [tenantId])?.['COUNT(*)'] ?? 0;
  const stages = getOneQuery<{ 'COUNT(*)': number }>('SELECT COUNT(*) FROM pipeline_stages WHERE tenant_id = ?', [tenantId])?.['COUNT(*)'] ?? 0;
  return { regions, pdvs, stages };
}

export function getRegionsByTenantId(tenantId: string): Promise<Region[]> {
  return getRegionsByTenant(tenantId);
}

export function getPdvsByTenantId(tenantId: string): PDV[] {
  return getPDVsByTenant(tenantId);
}

export function getCustomersByTenantId(tenantId: string): Customer[] {
  return getCustomersByTenant(tenantId);
}

export function getProductsByTenantId(tenantId: string): Product[] {
  return getProductsByTenant(tenantId);
}

export function getPipelineStagesByTenantId(tenantId: string): PipelineStage[] {
  return getPipelineStagesByTenant(tenantId);
}

export function getTagsByTenantId(tenantId: string): Tag[] {
  return getTagsByTenant(tenantId);
}

export function getDealsByTenantId(tenantId: string): Deal[] {
  return getDealsByTenant(tenantId);
}

export function getCustomFieldDefinitionsByTenantId(tenantId: string): CustomFieldDefinition[] {
  return getCustomFieldDefinitionsByTenant(tenantId);
}

export function getCustomFieldDefinitionById(id: string): CustomFieldDefinition | null {
  const row = getOneQuery<any>('SELECT * FROM custom_field_definitions WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    options: JSON.parse(row.options || '[]')
  };
}

export function getCustomFieldDefinitionsByEntityType(entityType: string, tenantId: string): CustomFieldDefinition[] {
  const rows = getQuery<any>('SELECT * FROM custom_field_definitions WHERE scope = ? AND tenant_id = ?', [entityType, tenantId]);
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.options || '[]')
  }));
}

export function getCustomersByPdvId(tenantId: string, pdvId: string): Customer[] {
  const rows = getQuery<any>('SELECT * FROM customers WHERE tenant_id = ? AND JSON_CONTAINS(pdv_ids, JSON_QUOTE(?))', [tenantId, pdvId]);
  return rows.map(row => ({
    ...row,
    pdv_ids: safeJsonParse(row.pdv_ids || '[]', []),
    assigned_employee_ids: safeJsonParse(row.assigned_employee_ids || '[]', []),
    custom_values: safeJsonParse(row.custom_values || '{}', {})
  }));
}

export function getDealsByPdvId(tenantId: string, pdvId: string): Deal[] {
  const rows = getQuery<any>('SELECT * FROM deals WHERE tenant_id = ? AND pdv_id = ? ORDER BY created_at DESC', [tenantId, pdvId]);
  return rows.map(row => ({
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  }));
}

export function getDealsByStageId(tenantId: string, stageId: string): Deal[] {
  const rows = getQuery<any>('SELECT * FROM deals WHERE tenant_id = ? AND stage_id = ? ORDER BY created_at DESC', [tenantId, stageId]);
  return rows.map(row => ({
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  }));
}

export function getDealsByCustomerId(tenantId: string, customerId: string): Deal[] {
  const rows = getQuery<any>('SELECT * FROM deals WHERE tenant_id = ? AND customer_id = ? ORDER BY created_at DESC', [tenantId, customerId]);
  return rows.map(row => ({
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  }));
}

export function getPdvsByRegionId(tenantId: string, regionId: string): PDV[] {
  return getQuery<PDV>('SELECT * FROM pdvs WHERE tenant_id = ? AND region_id = ? ORDER BY name', [tenantId, regionId]);
}

export function getPipelineStageById(id: string): PipelineStage | null {
  const row = getOneQuery<any>('SELECT * FROM pipeline_stages WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    automation_steps: JSON.parse(row.automation_steps || '[]')
  };
}

export function getRegionById(id: string): Region | null {
  return getOneQuery<Region>('SELECT * FROM regions WHERE id = ?', [id]);
}

export function getTagById(id: string): Tag | null {
  return getOneQuery<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
}

export function getProductById(id: string): Product | null {
  const row = getOneQuery<any>('SELECT * FROM products WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    attributes: JSON.parse(row.attributes || '[]'),
    form_schema: JSON.parse(row.form_schema || '[]'),
    automation_steps: JSON.parse(row.automation_steps || '[]')
  };
}

export function getIntegrationById(id: string): Integration | null {
  const row = getOneQuery<any>('SELECT * FROM integrations WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    config: JSON.parse(row.config || '{}')
  };
}

// Normalize widget rows to support both legacy (type/col_span/config) and newer
// (widget_type/data/position/size) shapes used by the API routes.
function mapDashboardWidget(row: any, fallbackPosition = 0) {
  const dataString = typeof row.data === 'string' ? row.data : row.config ?? '{}';
  const size = row.size ?? (row.col_span && row.col_span > 1 ? 'wide' : 'normal');

  return {
    ...row,
    widget_type: row.widget_type ?? row.type ?? row.title,
    data: dataString ?? '{}',
    position: row.position ?? fallbackPosition,
    size,
    config: safeJsonParse(dataString ?? '{}', {})
  };
}

export function getDashboardWidgetsByUserId(tenantId: string, userId: string): DashboardWidget[] {
  return getDashboardWidgetsByTenant(tenantId, userId);
}

// Compatibility helper expected by API routes that only pass the userId
export function getWidgetsByUserId(userId: string): any[] {
  const user = getUserById(userId);
  if (!user) return [];

  const rows = getQuery<any>(
    `SELECT * FROM dashboard_widgets WHERE tenant_id = ? AND (user_id = ? OR user_id IS NULL) ORDER BY created_at`,
    [user.tenant_id, userId]
  );

  return rows.map((row, index) => mapDashboardWidget(row, index));
}

export function getWidgetById(id: string): any | null {
  const row = getOneQuery<any>('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
  return row ? mapDashboardWidget(row) : null;
}

export function createWidget(
  userId: string,
  widgetType: string,
  data: string,
  position = 0,
  size: string = 'normal'
): any {
  const user = getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const id = generateId();
  const now = new Date().toISOString();
  const colSpan = size === 'wide' ? 2 : 1;

  runQuery(
    `INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.tenant_id, userId, widgetType, widgetType, colSpan, data ?? '{}', now, now]
  );

  return mapDashboardWidget(
    {
      id,
      tenant_id: user.tenant_id,
      user_id: userId,
      type: widgetType,
      title: widgetType,
      col_span: colSpan,
      config: data ?? '{}',
      created_at: now,
      updated_at: now,
    },
    position
  );
}

export function updateWidget(
  id: string,
  widgetType: string,
  data: string,
  position?: number,
  size?: string
): any | null {
  const existing = getWidgetById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const colSpan = size ? (size === 'wide' ? 2 : 1) : existing.col_span ?? 1;
  const configValue = data ?? existing.data ?? '{}';

  runQuery(
    `UPDATE dashboard_widgets
     SET type = ?, title = ?, col_span = ?, config = ?, updated_at = ?
     WHERE id = ?`,
    [widgetType, widgetType, colSpan, configValue, now, id]
  );

  return mapDashboardWidget(
    {
      ...existing,
      type: widgetType,
      title: widgetType,
      col_span: colSpan,
      config: configValue,
      updated_at: now,
    },
    position ?? existing.position ?? 0
  );
}

export function deleteWidget(id: string): void {
  runQuery('DELETE FROM dashboard_widgets WHERE id = ?', [id]);
}

// Backwards-compatible alias used by some API routes
export const getDashboardWidgets = getDashboardWidgetsByTenant;

// Alias for naming consistency (camelCase)
export const createPdv = createPDV;
export const getPdvsByTenant = getPDVsByTenant;
export const updatePdv = updatePDV;
export const deletePdv = deletePDV;

// Additional missing functions
export function getCustomerById(id: string): Customer | null {
  const row = getOneQuery<any>('SELECT * FROM customers WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    pdv_ids: safeJsonParse(row.pdv_ids || '[]', []),
    assigned_employee_ids: safeJsonParse(row.assigned_employee_ids || '[]', []),
    custom_values: safeJsonParse(row.custom_values || '{}', {})
  };
}

export function getDealById(id: string): Deal | null {
  const row = getOneQuery<any>('SELECT * FROM deals WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    assigned_employee_ids: JSON.parse(row.assigned_employee_ids || '[]'),
    product_ids: JSON.parse(row.product_ids || '[]'),
    custom_values: JSON.parse(row.custom_values || '{}'),
    tags: JSON.parse(row.tags || '[]')
  };
}

export function getPdvById(id: string): PDV | null {
  return getOneQuery<PDV>('SELECT * FROM pdvs WHERE id = ?', [id]);
}

export function getProductsByPdvId(tenantId: string, pdvId: string): Product[] {
  const rows = getQuery<any>('SELECT * FROM products WHERE tenant_id = ? AND pdv_id = ? ORDER BY name', [tenantId, pdvId]);
  return rows.map(row => ({
    ...row,
    attributes: JSON.parse(row.attributes || '[]'),
    form_schema: JSON.parse(row.form_schema || '[]'),
    automation_steps: JSON.parse(row.automation_steps || '[]')
  }));
}

// Permissions management (assuming a permissions table or JSON field in users)
export function getUserPermissions(userId: string): any {
  // Assuming permissions are stored in a JSON field or separate table
  const user = getUserById(userId);
  return user ? { permissions: 'default' } : null; // Placeholder
}

export function updateUserPermissions(userId: string, permissions: any): void {
  // Placeholder - implement based on actual schema
  console.log('Updating permissions for user', userId, permissions);
}

export function updateRegion(id: string, data: Partial<Region>): Region | null {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return getRegionById(id);

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  runQuery(`UPDATE regions SET ${fields.join(', ')} WHERE id = ?`, values);

  return getRegionById(id);
}

export function updateTag(id: string, label: string, color: string): Tag | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE tags SET label = ?, color = ?, updated_at = ? WHERE id = ?
  `, [label, color, now, id]);

  return getTagById(id);
}

export function seedTenantData(tenantId: string) {
  const now = new Date().toISOString();
  const db = getDatabase();
  db.pragma('foreign_keys = OFF');
  
  try {
    // Importar exatamente os dados do constants/index.ts
    const { 
      INITIAL_REGIONS, INITIAL_PDVS, INITIAL_EMPLOYEES, 
      INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_DEALS, 
      AVAILABLE_TAGS, INITIAL_STAGES, DEFAULT_DASHBOARD_WIDGETS, 
      INITIAL_CUSTOM_FIELDS 
    } = require('@/constants');
    
    // Seed Users/Employees
    INITIAL_EMPLOYEES.forEach((u: any) => {
      const passwordHash = bcrypt.hashSync('demo123', 10);
      runQuery(`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, pdv_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [u.id, tenantId, u.email, passwordHash, u.name, u.role, u.pdvId, now, now]);
    });
    
    // Seed Regions
    INITIAL_REGIONS.forEach((r: any) => {
      runQuery(`
        INSERT INTO regions (id, tenant_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `, [r.id, tenantId, r.name, now, now]);
    });
    
    // Seed PDVs
    INITIAL_PDVS.forEach((p: any) => {
      runQuery(`
        INSERT INTO pdvs (id, tenant_id, name, type, region_id, location, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [p.id, tenantId, p.name, p.type, p.regionId, p.location, now, now]);
    });
    
    // Seed Pipeline Stages
    INITIAL_STAGES.forEach((s: any, i: number) => {
      runQuery(`
        INSERT INTO pipeline_stages (id, tenant_id, name, color, type, automation_steps, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)
      `, [s.id, tenantId, s.name, s.color, s.type, i, now, now]);
    });
    
    // Seed Tags
    AVAILABLE_TAGS.forEach((t: any) => {
      runQuery(`
        INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [t.id, tenantId, t.label, t.color, now, now]);
    });
    
    // Seed Custom Field Definitions
    INITIAL_CUSTOM_FIELDS.forEach((cf: any) => {
      runQuery(`
        INSERT INTO custom_field_definitions (id, tenant_id, key, label, type, scope, options, required, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [cf.id, tenantId, cf.key, cf.label, cf.type, cf.scope, JSON.stringify(cf.options || []), cf.required ? 1 : 0, now, now]);
    });
    
    // Seed Products
    INITIAL_PRODUCTS.forEach((p: any) => {
      runQuery(`
        INSERT INTO products (id, tenant_id, name, description, category, base_price, attributes, form_schema, automation_steps, default_follow_up_days, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        p.id, tenantId, p.name, p.description, p.category, p.basePrice || 0,
        JSON.stringify(p.attributes || []), JSON.stringify(p.formSchema || []), JSON.stringify(p.automationSteps || []),
        p.defaultFollowUpDays || null, now, now
      ]);
    });
    
    // Seed Customers
    INITIAL_CUSTOMERS.forEach((c: any) => {
      runQuery(`
        INSERT INTO customers (id, tenant_id, type, name, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        c.id, tenantId, c.type, c.name, c.document, c.email, c.phone, c.zipCode, c.status,
        JSON.stringify(c.pdvIds), JSON.stringify(c.assignedEmployeeIds), JSON.stringify(c.customValues),
        now, now
      ]);
    });
    
    // Seed Deals
    INITIAL_DEALS.forEach((d: any) => {
      runQuery(`
        INSERT INTO deals (id, tenant_id, title, pdv_id, customer_id, customer_name, value, stage_id, visibility, assigned_employee_ids, product_ids, custom_values, tags, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        d.id, tenantId, d.title, d.pdvId, d.customerId, d.customerName, d.value, d.stageId, d.visibility,
        JSON.stringify(d.assignedEmployeeIds), JSON.stringify(d.productIds), JSON.stringify(d.customValues), 
        JSON.stringify(d.tags), d.notes, now, now
      ]);
    });
    
    // Seed Dashboard Widgets
    DEFAULT_DASHBOARD_WIDGETS.forEach((w: any) => {
      runQuery(`
        INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, '{}', ?, ?)
      `, [w.id, tenantId, w.type, w.title, w.colSpan, now, now]);
    });
    
    // Seed default integration
    runQuery(`
      INSERT INTO integrations (id, tenant_id, name, type, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'DISCONNECTED', '{}', ?, ?)
    `, ['whatsapp-1', tenantId, 'WhatsApp Business', 'WHATSAPP', now, now]);
    
    console.log(`Tenant ${tenantId} seeded successfully with demo data from constants`);
  } finally {
    db.pragma('foreign_keys = ON');
  }
}
