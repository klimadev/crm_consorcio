import { executeQuery as runQuery, getQuery, getOneQuery, generateId, getDatabase } from './client';
import bcrypt from 'bcryptjs';
import type { Tenant, User, PDV, Customer, Product, PipelineStage, Tag, Deal, Integration, CustomFieldDefinition, DashboardWidget, Preference, Session, Sale } from './schema';

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
  companyId: string,
  email: string,
  password: string,
  name: string,
  role: User['role'] = 'COLLABORATOR',
  pdvId: string | null = null
): User {
  const id = generateId();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO users (id, company_id, tenant_id, email, password_hash, name, role, pdv_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [id, companyId, companyId, email, passwordHash, name, role, pdvId, now, now]);
  
  return {
    id,
    tenant_id: companyId,
    company_id: companyId,
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
const ALLOWED_PDV_FIELDS = ['name', 'type', 'location', 'is_active'];
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

export function createPDV(
  tenantId: string,
  name: string,
  type: PDV['type'],
  location: string
): PDV {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO pdvs (id, tenant_id, name, type, location, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `, [id, tenantId, name, type, location, now, now]);
  
  return { id, tenant_id: tenantId, name, type, location, is_active: true, created_at: now, updated_at: now };
}

export function getPDVsByTenant(tenantId: string): PDV[] {
  return getQuery<PDV>('SELECT * FROM pdvs WHERE tenant_id = ? ORDER BY name', [tenantId]);
}

export function updatePDV(
  id: string,
  name: string,
  type: string,
  location: string
): PDV | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE pdvs SET name = ?, type = ?, location = ?, updated_at = ? WHERE id = ?
  `, [name, type, location, now, id]);

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
  pdvId?: string | null
): Customer {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(`
    INSERT INTO customers (id, tenant_id, pdv_id, name, type, document, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, pdvId, name, type, document, email, phone, status, now, now
  ]);

  return {
    id,
    tenant_id: tenantId,
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
  pdvId?: string | null
): Customer | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE customers SET name = ?, type = ?, document = ?, email = ?, phone = ?, status = ?, pdv_id = ?, updated_at = ? WHERE id = ?
  `, [name, type, document, email, phone, status, pdvId, now, id]);

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
  companyId: string,
  data: Omit<PipelineStage, 'id' | 'company_id' | 'tenant_id' | 'created_at' | 'updated_at'>
): PipelineStage {
  const id = generateId();
  const now = new Date().toISOString();
  
  const maxOrderResult = getOneQuery<{ 'COALESCE(MAX(order_index), -1)': number }>(
    'SELECT COALESCE(MAX(order_index), -1) FROM pipeline_stages WHERE company_id = ?', 
    [companyId]
  );
  const maxOrder = maxOrderResult?.['COALESCE(MAX(order_index), -1)'] ?? -1;
  
  runQuery(`
    INSERT INTO pipeline_stages (id, company_id, name, display_name, color, type, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, companyId, data.name, data.name, data.color || '#3b82f6', data.type,
    maxOrder + 1, now, now
  ]);
  
  return {
    id,
    company_id: companyId,
    tenant_id: companyId, // Backward compatibility
    display_name: data.name,
    ...data,
    automation_steps: '[]',
    order_index: maxOrder + 1,
    created_at: now,
    updated_at: now
  };
}

export function getPipelineStagesByTenant(companyId: string): PipelineStage[] {
  const rows = getQuery<any>('SELECT * FROM pipeline_stages WHERE company_id = ? ORDER BY order_index', [companyId]);
  return rows.map(row => ({
    ...row,
    tenant_id: row.company_id, // Backward compatibility
    automation_steps: JSON.parse(row.automation_steps || '[]')
  }));
}

// Alias for clarity
export const getPipelineStagesByCompany = getPipelineStagesByTenant;

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

export function reorderPipelineStages(companyId: string, stageIds: string[]): void {
  const now = new Date().toISOString();
  stageIds.forEach((id, index) => {
    runQuery('UPDATE pipeline_stages SET order_index = ?, updated_at = ? WHERE id = ? AND company_id = ?', [index, now, id, companyId]);
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
  extra: { year?: number; month?: number; window?: DateWindow } = {},
  rbacContext?: RBACContext
): { sql: string; params: Array<string | number> } {
  const managerPdvId = resolveManagerPdvId(tenantId, filters.managerId);
  const clauses = ['d.tenant_id = ?', `s.type = 'WON'`];
  const params: Array<string | number> = [tenantId];

  // RBAC filtering based on user role
  if (rbacContext) {
    if (rbacContext.role === 'COLLABORATOR') {
      // Collaborator sees only deals assigned to them
      clauses.push('d.assigned_employee_ids LIKE ?');
      params.push(`%"${rbacContext.userId}"%`);
    } else if (rbacContext.role === 'MANAGER' && rbacContext.pdvId) {
      // Manager sees only deals in their PDV
      clauses.push('d.pdv_id = ?');
      params.push(rbacContext.pdvId);
    }
    // OWNER sees all deals (no additional filtering)
  }

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
  } else if (!rbacContext || rbacContext.role === 'OWNER') {
    // Quando não há filtro de PDV e nem manager com PDV específico, incluir todos os PDVs
    // Apenas para OWNER
    clauses.push('d.pdv_id IS NOT NULL');
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

function getSalesTotals(tenantId: string, filters: CommercialDashboardFilters, extra: { year?: number; month?: number; window?: DateWindow } = {}, rbacContext?: RBACContext) {
  const base = buildWonDealsWhere(tenantId, filters, extra, rbacContext);
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

interface RBACContext {
  userId: string;
  role: string;
  membershipId?: string;
  pdvId?: string | null;
}

export function getCommercialDashboardSnapshot(
  tenantId: string,
  filters: CommercialDashboardFilters = {},
  rbacContext?: RBACContext
): CommercialDashboardSnapshot {
  const now = new Date();
  const selectedYear = filters.year ?? now.getFullYear();
  const selectedMonth = filters.month ?? now.getMonth() + 1;
  const selectedWindow = resolveDateWindow(filters, selectedYear, selectedMonth);

  const currentMonthTotals = getSalesTotals(tenantId, filters, { year: selectedYear, month: selectedMonth }, rbacContext);
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const previousMonthTotals = getSalesTotals(tenantId, filters, { year: prevMonthYear, month: prevMonth }, rbacContext);

  const yearlyTotals = getSalesTotals(tenantId, filters, { year: selectedYear }, rbacContext);
  const previousYearTotals = getSalesTotals(tenantId, filters, { year: selectedYear - 1 }, rbacContext);
  const selectedWindowTotals = getSalesTotals(tenantId, filters, { window: selectedWindow }, rbacContext);

  const monthlyComparisonPct = (previousMonthTotals.totalValue ?? 0) > 0
    ? (((currentMonthTotals.totalValue ?? 0) - (previousMonthTotals.totalValue ?? 0)) / (previousMonthTotals.totalValue ?? 0)) * 100
    : 0;
  const yearlyComparisonPct = (previousYearTotals.totalValue ?? 0) > 0
    ? (((yearlyTotals.totalValue ?? 0) - (previousYearTotals.totalValue ?? 0)) / (previousYearTotals.totalValue ?? 0)) * 100
    : 0;

  const baseWhere = buildWonDealsWhere(tenantId, filters, { window: selectedWindow }, rbacContext);
  const evolutionSeries = getQuery<{ label: string; value: number; count: number }>(
    `
      SELECT strftime('%Y-%m-%d', d.created_at) AS label,
             COALESCE(SUM(d.value), 0) AS value,
             COUNT(*) AS count
      FROM deals d
      JOIN pipeline_stages s ON s.id = d.stage_id
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
      JOIN pipeline_stages s ON s.id = d.stage_id
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
      JOIN pipeline_stages s ON s.id = d.stage_id
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
      JOIN pipeline_stages s ON s.id = d.stage_id
      LEFT JOIN pdvs p ON p.id = d.pdv_id AND p.tenant_id = d.tenant_id
      WHERE ${baseWhere.sql}
    `,
    baseWhere.params
  );

  // Build employee query with RBAC filtering
  let employeeQuery = 'SELECT id, name, role, pdv_id FROM users WHERE tenant_id = ? AND is_active = 1';
  const employeeParams: (string | number)[] = [tenantId];
  
  if (rbacContext) {
    if (rbacContext.role === 'COLLABORATOR') {
      // Collaborator sees only themselves
      employeeQuery += ' AND id = ?';
      employeeParams.push(rbacContext.userId);
    } else if (rbacContext.role === 'MANAGER' && rbacContext.pdvId) {
      // Manager sees only employees in their PDV
      employeeQuery += ' AND pdv_id = ?';
      employeeParams.push(rbacContext.pdvId);
    }
    // OWNER sees all employees
  }
  
  const employees = getQuery<{ id: string; name: string; role: User['role']; pdv_id: string | null }>(
    employeeQuery,
    employeeParams
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
      if (!employee || employee.role !== 'COLLABORATOR' || countedSellers.has(employeeId)) return;
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
    .map(([employeeId, aggregate]) => toRankingEntry(employeeId, 'COLLABORATOR', aggregate))
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
export function countEntitiesByTenant(companyId: string): { pdvs: number; stages: number } {
  const pdvs = getOneQuery<{ 'COUNT(*)': number }>('SELECT COUNT(*) FROM pdvs WHERE tenant_id = ?', [companyId])?.['COUNT(*)'] ?? 0;
  const stages = getOneQuery<{ 'COUNT(*)': number }>('SELECT COUNT(*) FROM pipeline_stages WHERE company_id = ?', [companyId])?.['COUNT(*)'] ?? 0;
  return { pdvs, stages };
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

export function getPipelineStageById(id: string): PipelineStage | null {
  const row = getOneQuery<any>('SELECT * FROM pipeline_stages WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    automation_steps: JSON.parse(row.automation_steps || '[]')
  };
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

export function updateTag(id: string, label: string, color: string): Tag | null {
  const now = new Date().toISOString();

  runQuery(`
    UPDATE tags SET label = ?, color = ?, updated_at = ? WHERE id = ?
  `, [label, color, now, id]);

  return getTagById(id);
}

// ─────────────────────────────────────────────────────────────
// Sales Consistency & Installment Tracking
// ─────────────────────────────────────────────────────────────

export function createSale(
  tenantId: string,
  customerName: string,
  sellerId: string,
  sellerName: string,
  totalValue: number,
  data: {
    dealId?: string | null;
    customerId?: string | null;
    pdvId?: string | null;
    productId?: string | null;
    productName?: string | null;
    creditValue?: number;
    planMonths?: number | null;
    notes?: string;
    installment1?: { dueDate?: string; value?: number };
    installment2?: { dueDate?: string; value?: number };
    installment3?: { dueDate?: string; value?: number };
    installment4?: { dueDate?: string; value?: number };
  } = {}
): Sale {
  const id = generateId();
  const now = new Date().toISOString();

  runQuery(
    `
      INSERT INTO sales (
        id, tenant_id, deal_id, customer_id, customer_name,
        seller_id, seller_name, pdv_id, product_id, product_name,
        total_value, credit_value, plan_months,
        consistency_status,
        installment_1_due_date, installment_1_value,
        installment_2_due_date, installment_2_value,
        installment_3_due_date, installment_3_value,
        installment_4_due_date, installment_4_value,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      tenantId,
      data.dealId || null,
      data.customerId || null,
      customerName,
      sellerId,
      sellerName,
      data.pdvId || null,
      data.productId || null,
      data.productName || null,
      totalValue,
      data.creditValue || 0,
      data.planMonths || null,
      'AWAITING_CONSISTENCY',
      data.installment1?.dueDate || null,
      data.installment1?.value || 0,
      data.installment2?.dueDate || null,
      data.installment2?.value || 0,
      data.installment3?.dueDate || null,
      data.installment3?.value || 0,
      data.installment4?.dueDate || null,
      data.installment4?.value || 0,
      data.notes || null,
      now,
      now,
    ]
  );

  const sale = getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
  if (!sale) {
    throw new Error('Failed to create sale');
  }
  return sale;
}

export function getSalesByTenant(tenantId: string): Sale[] {
  return getQuery<Sale>('SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
}

export function getSalesByStatus(
  tenantId: string,
  status: 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT'
): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? AND consistency_status = ? ORDER BY created_at DESC',
    [tenantId, status]
  );
}

export function getSalesBySeller(tenantId: string, sellerId: string): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? AND seller_id = ? ORDER BY created_at DESC',
    [tenantId, sellerId]
  );
}

export function getSalesBySellerAndStatus(
  tenantId: string,
  sellerId: string,
  status: 'AWAITING_CONSISTENCY' | 'CONSISTENT' | 'INCONSISTENT'
): Sale[] {
  return getQuery<Sale>(
    'SELECT * FROM sales WHERE tenant_id = ? AND seller_id = ? AND consistency_status = ? ORDER BY created_at DESC',
    [tenantId, sellerId, status]
  );
}

export function getSaleById(id: string): Sale | null {
  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}

export function validateSale(
  id: string,
  validatorId: string,
  status: 'CONSISTENT' | 'INCONSISTENT',
  notes: string = ''
): Sale | null {
  const now = new Date().toISOString();

  runQuery(
    `
      UPDATE sales
      SET consistency_status = ?,
          validated_by = ?,
          validated_at = ?,
          validation_notes = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [status, validatorId, now, notes, now, id]
  );

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}

export function updateInstallmentStatus(
  saleId: string,
  installmentNumber: 1 | 2 | 3 | 4,
  status: 'PENDING' | 'RECEIVED' | 'OVERDUE',
  receivedDate?: string | null
): Sale | null {
  const now = new Date().toISOString();
  const statusCol = `installment_${installmentNumber}_status`;
  const receivedCol = `installment_${installmentNumber}_received_date`;

  runQuery(
    `
      UPDATE sales
      SET ${statusCol} = ?,
          ${receivedCol} = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [status, receivedDate || null, now, saleId]
  );

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [saleId]);
}

export function updateSale(
  id: string,
  data: {
    customerName?: string;
    customerId?: string | null;
    pdvId?: string | null;
    productId?: string | null;
    productName?: string | null;
    totalValue?: number;
    creditValue?: number;
    planMonths?: number | null;
    notes?: string | null;
    installment1?: { dueDate?: string; value?: number };
    installment2?: { dueDate?: string; value?: number };
    installment3?: { dueDate?: string; value?: number };
    installment4?: { dueDate?: string; value?: number };
  }
): Sale | null {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  const existing = getOneQuery<{ consistency_status: Sale['consistency_status'] }>(
    'SELECT consistency_status FROM sales WHERE id = ?',
    [id]
  );

  // Resubmission behavior: editing an inconsistent sale moves it back to awaiting
  if (existing?.consistency_status === 'INCONSISTENT') {
    sets.push('consistency_status = ?');
    params.push('AWAITING_CONSISTENCY');
    sets.push('validated_by = NULL');
    sets.push('validated_at = NULL');
    sets.push('validation_notes = NULL');
  }

  if (data.customerName !== undefined) {
    sets.push('customer_name = ?');
    params.push(data.customerName);
  }
  if (data.customerId !== undefined) {
    sets.push('customer_id = ?');
    params.push(data.customerId);
  }
  if (data.pdvId !== undefined) {
    sets.push('pdv_id = ?');
    params.push(data.pdvId);
  }
  if (data.productId !== undefined) {
    sets.push('product_id = ?');
    params.push(data.productId);
  }
  if (data.productName !== undefined) {
    sets.push('product_name = ?');
    params.push(data.productName);
  }
  if (data.totalValue !== undefined) {
    sets.push('total_value = ?');
    params.push(data.totalValue);
  }
  if (data.creditValue !== undefined) {
    sets.push('credit_value = ?');
    params.push(data.creditValue);
  }
  if (data.planMonths !== undefined) {
    sets.push('plan_months = ?');
    params.push(data.planMonths);
  }
  if (data.notes !== undefined) {
    sets.push('notes = ?');
    params.push(data.notes);
  }

  for (const n of [1, 2, 3, 4] as const) {
    const inst = data[`installment${n}` as keyof typeof data] as { dueDate?: string; value?: number } | undefined;
    if (!inst) continue;
    if (inst.dueDate !== undefined) {
      sets.push(`installment_${n}_due_date = ?`);
      params.push(inst.dueDate);
    }
    if (inst.value !== undefined) {
      sets.push(`installment_${n}_value = ?`);
      params.push(inst.value);
    }
  }

  params.push(id);
  runQuery(`UPDATE sales SET ${sets.join(', ')} WHERE id = ?`, params);

  return getOneQuery<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}

export function deleteSale(id: string): void {
  runQuery('DELETE FROM sales WHERE id = ?', [id]);
}

export function getSalesCountByStatus(tenantId: string): Record<string, number> {
  const rows = getQuery<{ consistency_status: string; count: number }>(
    `
      SELECT consistency_status, COUNT(*) as count
      FROM sales
      WHERE tenant_id = ?
      GROUP BY consistency_status
    `,
    [tenantId]
  );

  const result: Record<string, number> = {
    AWAITING_CONSISTENCY: 0,
    CONSISTENT: 0,
    INCONSISTENT: 0,
  };

  for (const row of rows) {
    result[row.consistency_status] = row.count;
  }

  return result;
}

export function getSalesCountByStatusForSeller(tenantId: string, sellerId: string): Record<string, number> {
  const rows = getQuery<{ consistency_status: string; count: number }>(
    `
      SELECT consistency_status, COUNT(*) as count
      FROM sales
      WHERE tenant_id = ? AND seller_id = ?
      GROUP BY consistency_status
    `,
    [tenantId, sellerId]
  );

  const result: Record<string, number> = {
    AWAITING_CONSISTENCY: 0,
    CONSISTENT: 0,
    INCONSISTENT: 0,
  };

  for (const row of rows) {
    result[row.consistency_status] = row.count;
  }

  return result;
}
