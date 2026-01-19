import { getDb, runQuery, getQuery, getOneQuery, generateId, closeDb } from './index';
import bcrypt from 'bcryptjs';
import type { Tenant, User, Region, PDV, Customer, Product, PipelineStage, Tag, Deal, Integration, CustomFieldDefinition, DashboardWidget } from '@/types/db';

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
    INSERT INTO users (id, tenant_id, email, password_hash, name, role, pdv_id, active, created_at, updated_at)
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

export async function getUserById(id: string): Promise<(User & { tenant_slug: string }) | null> {
  const row = await getOneQuery<any>(`
    SELECT u.*, t.slug as tenant_slug
    FROM users u
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ?
  `, [id]);
  return row || null;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getUsersByTenant(tenantId: string): Promise<User[]> {
  return await getQuery<User>('SELECT * FROM users WHERE tenant_id = ? ORDER BY name', [tenantId]);
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

  const fields = filtered.map(([key]) => `${key} = ?`);
  const values = filtered.map(([, value]) => value);
  
  values.push(now);
  values.push(id);

  await runQuery(`UPDATE users SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, values);

  return await getUserById(id);
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

export function updatePDV(id: string, data: Partial<PDV>): PDV | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });
  
  if (fields.length === 0) return getPDVsByTenant('').find(p => p.id === id) || null;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE pdvs SET ${fields.join(', ')} WHERE id = ?`, values);
  
  const row = getOneQuery<PDV>('SELECT * FROM pdvs WHERE id = ?', [id]);
  return row;
}

export function deletePDV(id: string): void {
  runQuery('DELETE FROM pdvs WHERE id = ?', [id]);
}

export function createCustomer(
  tenantId: string,
  data: Omit<Customer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Customer {
  const id = generateId();
  const now = new Date().toISOString();
  
  const filtered = Object.entries(data).filter(([key]) => 
    ALLOWED_CUSTOMER_FIELDS.includes(key)
  );
  
  runQuery(`
    INSERT INTO customers (id, tenant_id, type, name, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.type, data.name, data.document || '', data.email || '', 
    data.phone || '', data.zip_code || '', data.status,
    JSON.stringify(data.pdv_ids || []), JSON.stringify(data.assigned_employee_ids || []), JSON.stringify(data.custom_values || {}),
    now, now
  ]);
  
  return {
    id,
    tenant_id: tenantId,
    type: data.type,
    name: data.name,
    document: data.document || '',
    email: data.email || '',
    phone: data.phone || '',
    zip_code: data.zip_code || '',
    status: data.status,
    pdv_ids: JSON.stringify(data.pdv_ids || []),
    assigned_employee_ids: JSON.stringify(data.assigned_employee_ids || []),
    custom_values: JSON.stringify(data.custom_values || {}),
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

export function updateCustomer(id: string, data: Partial<Customer>): Customer | null {
  const now = new Date().toISOString();
  
  const filtered = Object.entries(data).filter(([key, value]) => 
    ALLOWED_CUSTOMER_FIELDS.includes(key) && key !== 'id' && key !== 'tenant_id' && key !== 'created_at'
  );
  
  if (filtered.length === 0) return getCustomersByTenant('').find(c => c.id === id) || null;

  const fields = filtered.map(([k]) => `${k} = ?`);
  const values = filtered.map(([, value]) => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return value;
  });
  
  values.push(now);
  values.push(id);

  runQuery(`UPDATE customers SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, values);

  return getCustomersByTenant('').find(c => c.id === id) || null;
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

export function updateProduct(id: string, data: Partial<Product>): Product | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (['attributes', 'form_schema', 'automation_steps'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (fields.length === 0) return getProductsByTenant('').find(p => p.id === id) || null;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  
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

export function updatePipelineStage(id: string, data: Partial<PipelineStage>): PipelineStage | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (key === 'automation_steps') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (fields.length === 0) return getPipelineStagesByTenant('').find(s => s.id === id) || null;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE pipeline_stages SET ${fields.join(', ')} WHERE id = ?`, values);
  
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
  data: Omit<Deal, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Deal {
  const id = generateId();
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO deals (id, tenant_id, title, pdv_id, customer_id, customer_name, value, stage_id, visibility, assigned_employee_ids, product_ids, custom_values, tags, notes, next_follow_up_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, tenantId, data.title, data.pdv_id, data.customer_id, data.customer_name, data.value || 0,
    data.stage_id, data.visibility, JSON.stringify(data.assigned_employee_ids || []),
    JSON.stringify(data.product_ids || []), JSON.stringify(data.custom_values || {}),
    JSON.stringify(data.tags || []), data.notes || '', data.next_follow_up_date || null,
    now, now
  ]);
  
  return {
    id,
    tenant_id: tenantId,
    ...data,
    assigned_employee_ids: JSON.stringify(data.assigned_employee_ids || []),
    product_ids: JSON.stringify(data.product_ids || []),
    custom_values: JSON.stringify(data.custom_values || {}),
    tags: JSON.stringify(data.tags || []),
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

export function updateDeal(id: string, data: Partial<Deal>): Deal | null {
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
      if (['assigned_employee_ids', 'product_ids', 'custom_values', 'tags'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });
  
  if (fields.length === 0) return getDealsByTenant('').find(d => d.id === id) || null;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  runQuery(`UPDATE deals SET ${fields.join(', ')} WHERE id = ?`, values);
  
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
    options: JSON.stringify(data.options || []),
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

export function seedTenantData(tenantId: string) {
  const now = new Date().toISOString();
  
  const users = [
    { id: 'admin-01', name: 'Diretoria (Admin)', email: 'admin@mc.com', role: 'ADMIN', pdvId: null },
    { id: 'gerente-sp', name: 'Roberto (Gerente SP)', email: 'roberto@mc.com', role: 'MANAGER', pdvId: 'pdv-sp-01' },
    { id: 'rep-sp-01', name: 'Ana (Vendedora SP)', email: 'ana@mc.com', role: 'SALES_REP', pdvId: 'pdv-sp-01' },
    { id: 'rep-sp-02', name: 'Marcos (Vendedor SP)', email: 'marcos@mc.com', role: 'SALES_REP', pdvId: 'pdv-sp-01' },
    { id: 'gerente-sul', name: 'Carla (Gerente Sul)', email: 'carla@mc.com', role: 'MANAGER', pdvId: 'pdv-sul-01' },
    { id: 'rep-sul-01', name: 'João (Vendedor Sul)', email: 'joao@mc.com', role: 'SALES_REP', pdvId: 'pdv-sul-01' },
    { id: 'rep-sul-02', name: 'Fernanda (Vendedora Sul)', email: 'fernanda@mc.com', role: 'SALES_REP', pdvId: 'pdv-sul-01' },
    { id: 'support-01', name: 'Suporte ( Atendimento)', email: 'suporte@mc.com', role: 'SUPPORT', pdvId: null },
  ];
  
  users.forEach(u => {
    const passwordHash = bcrypt.hashSync('demo123', 10);
    runQuery(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, pdv_id, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [u.id, tenantId, u.email, passwordHash, u.name, u.role, u.pdvId, now, now]);
  });
  
  const regions = [
    { id: 'r1', name: 'Sudeste (SP/RJ)' },
    { id: 'r2', name: 'Sul (PR/SC/RS)' },
    { id: 'r3', name: 'Nordeste (BA/PE/CE)' },
    { id: 'r4', name: 'Centro-Oeste (DF/GO)' },
  ];
  
  regions.forEach(r => {
    runQuery(`
      INSERT INTO regions (id, tenant_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [r.id, tenantId, r.name, now, now]);
  });
  
  const pdvs = [
    { id: 'pdv-sp-01', name: 'Loja Berrini (SP)', type: 'PHYSICAL_STORE', regionId: 'r1', location: 'São Paulo, SP' },
    { id: 'pdv-sp-02', name: 'Quiosque Morumbi', type: 'KIOSK', regionId: 'r1', location: 'São Paulo, SP' },
    { id: 'pdv-sp-03', name: 'Loja Paulista', type: 'PHYSICAL_STORE', regionId: 'r1', location: 'São Paulo, SP' },
    { id: 'pdv-sul-01', name: 'Filial Curitiba', type: 'PHYSICAL_STORE', regionId: 'r2', location: 'Curitiba, PR' },
    { id: 'pdv-sul-02', name: 'Loja Floripa', type: 'PHYSICAL_STORE', regionId: 'r2', location: 'Florianópolis, SC' },
    { id: 'pdv-ne-01', name: 'Loja Salvador', type: 'PHYSICAL_STORE', regionId: 'r3', location: 'Salvador, BA' },
    { id: 'pdv-co-01', name: 'Loja Brasília', type: 'PHYSICAL_STORE', regionId: 'r4', location: 'Brasília, DF' },
    { id: 'pdv-online-01', name: 'E-commerce MC', type: 'ONLINE', regionId: 'r1', location: 'Online' },
    { id: 'pdv-call-01', name: 'Central de Vendas', type: 'CALL_CENTER', regionId: 'r1', location: 'São Paulo, SP' },
  ];
  
  pdvs.forEach(p => {
    runQuery(`
      INSERT INTO pdvs (id, tenant_id, name, type, region_id, location, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [p.id, tenantId, p.name, p.type, p.regionId, p.location, now, now]);
  });
  
  const stages = [
    { id: 'stage-lead', name: 'Prospecção', color: 'border-t-blue-500', type: 'OPEN' },
    { id: 'stage-contacted', name: 'Qualificação', color: 'border-t-yellow-500', type: 'OPEN' },
    { id: 'stage-proposal', name: 'Apresentação', color: 'border-t-purple-500', type: 'OPEN' },
    { id: 'stage-negotiation', name: 'Fechamento', color: 'border-t-orange-500', type: 'OPEN' },
    { id: 'stage-won', name: 'Vendido', color: 'border-t-green-500', type: 'WON' },
    { id: 'stage-lost', name: 'Perdido', color: 'border-t-red-500', type: 'LOST' },
  ];
  
  stages.forEach((s, i) => {
    runQuery(`
      INSERT INTO pipeline_stages (id, tenant_id, name, color, type, automation_steps, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)
    `, [s.id, tenantId, s.name, s.color, s.type, i, now, now]);
  });
  
  const tags = [
    { id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
    { id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' },
    { id: 't3', label: 'Frio', color: 'bg-blue-100 text-blue-800' },
    { id: 't4', label: 'Urgente', color: 'bg-orange-100 text-orange-800' },
    { id: 't5', label: 'Novo Lead', color: 'bg-green-100 text-green-800' },
    { id: 't6', label: 'Follow-up', color: 'bg-yellow-100 text-yellow-800' },
    { id: 't7', label: 'Alto Potencial', color: 'bg-pink-100 text-pink-800' },
    { id: 't8', label: 'Parceiro', color: 'bg-indigo-100 text-indigo-800' },
  ];
  
  tags.forEach(t => {
    runQuery(`
      INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [t.id, tenantId, t.label, t.color, now, now]);
  });
  
  const customFields = [
    { id: 'cf-deal-source', key: 'origin_source', label: 'Origem do Lead', type: 'select', scope: 'DEAL', options: ['Google Ads', 'Indicação', 'Instagram', 'Facebook', 'Passante', 'E-mail Marketing', 'Telefone', 'WhatsApp', 'Site'], required: true },
    { id: 'cf-cust-birth', key: 'birthdate', label: 'Data de Nascimento / Fundação', type: 'date', scope: 'CUSTOMER', required: false },
    { id: 'cf-cust-segment', key: 'segment', label: 'Segmento', type: 'select', scope: 'CUSTOMER', options: ['Varejo', 'Atacado', 'Serviços', 'Indústria', 'Governo', 'Agronegócio', 'Imobiliário', 'Automotivo', 'Tecnologia', 'Saúde'], required: false },
    { id: 'cf-deal-expected-close', key: 'expected_close_date', label: 'Previsão de Fechamento', type: 'date', scope: 'DEAL', required: false },
    { id: 'cf-deal-competitor', key: 'competitor', label: 'Concorrente na disputa', type: 'text', scope: 'DEAL', required: false },
    { id: 'cf-cust-revenue', key: 'annual_revenue', label: 'Faturamento Anual', type: 'number', scope: 'CUSTOMER', required: false },
    { id: 'cf-cust-employees', key: 'employees_count', label: 'Número de Funcionários', type: 'number', scope: 'CUSTOMER', required: false },
  ];
  
  customFields.forEach(cf => {
    runQuery(`
      INSERT INTO custom_field_definitions (id, tenant_id, key, label, type, scope, options, required, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [cf.id, tenantId, cf.key, cf.label, cf.type, cf.scope, JSON.stringify(cf.options || []), cf.required ? 1 : 0, now, now]);
  });
  
  const products = [
    {
      id: 'p1', name: 'Carta Imóvel 500k', description: 'Consórcio Imobiliário Premium para imóveis de alto padrão', category: 'Consórcio Imóvel', basePrice: 500000,
      attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '14%' }, { key: 'prazo', label: 'Prazo Máximo', value: '180 meses' }],
      formSchema: [
        { key: 'group_number', label: 'Grupo', type: 'text', required: true },
        { key: 'quota_number', label: 'Cota', type: 'text', required: true },
        { key: 'contract_term', label: 'Prazo (Meses)', type: 'number', required: true }
      ],
      automationSteps: [
        { id: 's1', name: 'Boas vindas imediata', delayValue: 5, delayUnit: 'MINUTES', messageTemplate: 'Olá, obrigado por adquirir o Consórcio Imóvel. Seu contrato está sendo gerado.' },
        { id: 's2', name: 'Check de assembleia', delayValue: 20, delayUnit: 'DAYS', messageTemplate: 'Olá, sua primeira assembleia está chegando. Fique atento!' }
      ],
      defaultFollowUpDays: 30
    },
    {
      id: 'p2', name: 'Carta Imóvel 250k', description: 'Consórcio Imobiliário Standard para imóveis residenciais', category: 'Consórcio Imóvel', basePrice: 250000,
      attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '15%' }, { key: 'prazo', label: 'Prazo Máximo', value: '180 meses' }],
      formSchema: [
        { key: 'group_number', label: 'Grupo', type: 'text', required: true },
        { key: 'quota_number', label: 'Cota', type: 'text', required: true },
      ],
      automationSteps: [
        { id: 's1', name: 'Boas vindas', delayValue: 10, delayUnit: 'MINUTES', messageTemplate: 'Bem-vindo ao consórcio! Vamos realizar seu sonho.' }
      ],
      defaultFollowUpDays: 30
    },
    {
      id: 'p3', name: 'Consórcio Auto 80k', description: 'Veículos leves e utilitários até 80 mil', category: 'Consórcio Auto', basePrice: 80000,
      attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '16%' }],
      formSchema: [
        { key: 'group_number', label: 'Grupo', type: 'text', required: true },
        { key: 'quota_number', label: 'Cota', type: 'text', required: true },
        { key: 'vehicle_type', label: 'Tipo de Veículo', type: 'select', options: ['Carro', 'Moto', 'Caminhão', 'Utilitário'], required: true }
      ],
      automationSteps: [],
      defaultFollowUpDays: 15
    },
    {
      id: 'p4', name: 'Consórcio Auto 150k', description: 'Veículos premium e SUVs', category: 'Consórcio Auto', basePrice: 150000,
      attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '15%' }],
      formSchema: [
        { key: 'group_number', label: 'Grupo', type: 'text', required: true },
        { key: 'quota_number', label: 'Cota', type: 'text', required: true },
      ],
      automationSteps: [],
      defaultFollowUpDays: 15
    },
    {
      id: 'p5', name: 'Consórcio Moto 25k', description: 'Motocicletas e scooters', category: 'Consórcio Moto', basePrice: 25000,
      attributes: [{ key: 'taxa', label: 'Taxa Adm', value: '12%' }],
      formSchema: [
        { key: 'group_number', label: 'Grupo', type: 'text', required: true },
        { key: 'quota_number', label: 'Cota', type: 'text', required: true },
        { key: 'brand', label: 'Marca', type: 'text', required: false }
      ],
      automationSteps: [],
      defaultFollowUpDays: 10
    },
    {
      id: 'p6', name: 'iPhone 15 Pro Max', description: 'Apple iPhone 15 Pro Max 256GB', category: 'Varejo', basePrice: 9000,
      attributes: [{ key: 'brand', label: 'Marca', value: 'Apple' }, { key: 'warranty', label: 'Garantia', value: '1 ano Apple' }],
      formSchema: [
        { key: 'sku', label: 'SKU / Código', type: 'text', required: true },
        { key: 'color', label: 'Cor', type: 'select', options: ['Titânio Natural', 'Preto', 'Branco', 'Azul'], required: true },
        { key: 'storage', label: 'Armazenamento', type: 'select', options: ['256GB', '512GB', '1TB'], required: true },
        { key: 'imei', label: 'IMEI', type: 'text', required: false }
      ],
      automationSteps: [],
      defaultFollowUpDays: 7
    },
    {
      id: 'p7', name: 'Samsung Galaxy S24', description: 'Samsung Galaxy S24 Ultra', category: 'Varejo', basePrice: 7500,
      attributes: [{ key: 'brand', label: 'Marca', value: 'Samsung' }],
      formSchema: [
        { key: 'sku', label: 'SKU', type: 'text', required: true },
        { key: 'color', label: 'Cor', type: 'select', options: ['Cinza', 'Preto', 'Violeta', 'Amarelo'], required: true },
      ],
      automationSteps: [],
      defaultFollowUpDays: 7
    },
    {
      id: 'p8', name: 'Notebook Dell XPS', description: 'Dell XPS 15 Laptop', category: 'Varejo', basePrice: 12000,
      attributes: [{ key: 'brand', label: 'Marca', value: 'Dell' }],
      formSchema: [
        { key: 'sku', label: 'SKU', type: 'text', required: true },
        { key: 'processor', label: 'Processador', type: 'text', required: false },
        { key: 'ram', label: 'RAM', type: 'text', required: false },
      ],
      automationSteps: [],
      defaultFollowUpDays: 14
    },
    {
      id: 'p9', name: 'Serviço de Consultoria Financeira', description: 'Planejamento financeiro pessoal e empresarial', category: 'Serviços', basePrice: 2500,
      attributes: [{ key: 'duration', label: 'Duração', value: '4 horas' }],
      formSchema: [
        { key: 'service_type', label: 'Tipo de Consultoria', type: 'select', options: ['Pessoal', 'Empresarial', 'Investimentos', 'Aposentadoria'], required: true },
        { key: 'client_name', label: 'Nome do Cliente', type: 'text', required: true },
      ],
      automationSteps: [
        { id: 's1', name: 'Agendamento confirmação', delayValue: 1, delayUnit: 'HOURS', messageTemplate: 'Sua consultoria foi agendada. Prepare-se para transformar suas finanças!' }
      ],
      defaultFollowUpDays: 30
    },
    {
      id: 'p10', name: 'Seguro de Vida em Grupo', description: 'Proteção para sua equipe', category: 'Seguros', basePrice: 500,
      attributes: [{ key: 'coverage', label: 'Cobertura', value: 'R$ 100.000' }],
      formSchema: [
        { key: 'company_name', label: 'Empresa', type: 'text', required: true },
        { key: 'employees_count', label: 'Número de Funcionários', type: 'number', required: true },
      ],
      automationSteps: [],
      defaultFollowUpDays: 45
    }
  ];
  
  products.forEach(p => {
    runQuery(`
      INSERT INTO products (id, tenant_id, name, description, category, base_price, attributes, form_schema, automation_steps, default_follow_up_days, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      p.id, tenantId, p.name, p.description, p.category, p.basePrice || 0,
      JSON.stringify(p.attributes || []), JSON.stringify(p.formSchema || []), JSON.stringify(p.automationSteps || []),
      p.defaultFollowUpDays || null, now, now
    ]);
  });
  
  const customers = [
    {
      id: 'c1', type: 'PJ' as const, name: 'Tech Solutions PJ', document: '12.345.678/0001-90', email: 'contato@tech.com', phone: '11 99999-9999', zipCode: '04551-000',
      status: 'ACTIVE' as const, pdvIds: ['pdv-sp-01'], assignedEmployeeIds: ['rep-sp-01'],
      customValues: { segment: 'Tecnologia', annual_revenue: 5000000, employees_count: 50 }
    },
    {
      id: 'c2', type: 'PJ' as const, name: 'Agro Sul Ltda', document: '98.765.432/0001-10', email: 'comercial@agrosul.com', phone: '41 88888-8888', zipCode: '80240-000',
      status: 'PROPONENT' as const, pdvIds: ['pdv-sul-01'], assignedEmployeeIds: ['rep-sul-01'],
      customValues: { segment: 'Agronegócio', annual_revenue: 12000000, employees_count: 120 }
    },
    {
      id: 'c3', type: 'PF' as const, name: 'Investidor João Silva', document: '123.456.789-00', email: 'joao.silva@gmail.com', phone: '11 98888-7777', zipCode: '01310-100',
      status: 'LEAD' as const, pdvIds: ['pdv-sp-01', 'pdv-sul-01'], assignedEmployeeIds: ['gerente-sp'],
      customValues: { birthdate: '1985-05-15', segment: 'Investidor' }
    },
    {
      id: 'c4', type: 'PJ' as const, name: 'Construtora Delta', document: '45.678.901/0001-23', email: 'vendas@delta.com.br', phone: '21 33333-3333', zipCode: '20040-000',
      status: 'ACTIVE' as const, pdvIds: ['pdv-sp-01'], assignedEmployeeIds: ['rep-sp-02'],
      customValues: { segment: 'Imobiliário', annual_revenue: 45000000, employees_count: 200 }
    },
    {
      id: 'c5', type: 'PF' as const, name: 'Empresária Maria Santos', document: '987.654.321-00', email: 'maria.santos@outlook.com', phone: '11 97777-6666', zipCode: '01415-000',
      status: 'PROPONENT' as const, pdvIds: ['pdv-sp-03'], assignedEmployeeIds: ['rep-sp-01'],
      customValues: { birthdate: '1978-03-22', segment: 'Empresária' }
    },
    {
      id: 'c6', type: 'PJ' as const, name: 'Frota Rent a Car', document: '33.222.111/0001-44', email: 'frota@frotacar.com.br', phone: '51 32222-2222', zipCode: '90020-000',
      status: 'LEAD' as const, pdvIds: ['pdv-sul-02'], assignedEmployeeIds: ['rep-sul-02'],
      customValues: { segment: 'Automotivo', annual_revenue: 8000000, employees_count: 80 }
    },
    {
      id: 'c7', type: 'PJ' as const, name: 'Hospital São Lucas', document: '55.444.333/0001-55', email: 'compras@saolucas.com.br', phone: '71 35555-5555', zipCode: '40110-000',
      status: 'ACTIVE' as const, pdvIds: ['pdv-ne-01'], assignedEmployeeIds: ['gerente-sul'],
      customValues: { segment: 'Saúde', annual_revenue: 120000000, employees_count: 1500 }
    },
    {
      id: 'c8', type: 'PF' as const, name: 'Engenheiro Carlos Mendes', document: '111.222.333-44', email: 'carlos.mendes@eng.com.br', phone: '61 34444-4444', zipCode: '70000-000',
      status: 'DEFAULTING' as const, pdvIds: ['pdv-co-01'], assignedEmployeeIds: ['gerente-sp'],
      customValues: { birthdate: '1990-08-10', segment: 'Engenharia' }
    },
    {
      id: 'c9', type: 'PJ' as const, name: 'Escola Modelo', document: '66.777.888/0001-99', email: 'financeiro@escolamodelo.edu.br', phone: '11 38888-8888', zipCode: '05051-000',
      status: 'CHURN' as const, pdvIds: ['pdv-sp-01'], assignedEmployeeIds: ['rep-sp-02'],
      customValues: { segment: 'Educação', annual_revenue: 3500000, employees_count: 150 }
    },
    {
      id: 'c10', type: 'PF' as const, name: 'Médica Dra. Ana Paula', document: '222.333.444-55', email: 'anapaula@med.com.br', phone: '11 39999-9999', zipCode: '01234-000',
      status: 'PENDING' as const, pdvIds: ['pdv-sp-02'], assignedEmployeeIds: ['rep-sp-01'],
      customValues: { birthdate: '1975-12-01', segment: 'Saúde' }
    }
  ];
  
  customers.forEach(c => {
    runQuery(`
      INSERT INTO customers (id, tenant_id, type, name, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      c.id, tenantId, c.type, c.name, c.document, c.email, c.phone, c.zipCode, c.status,
      JSON.stringify(c.pdvIds), JSON.stringify(c.assignedEmployeeIds), JSON.stringify(c.customValues),
      now, now
    ]);
  });
  
  const deals = [
    {
      id: 'd1', title: 'Expansão Sede Tech Solutions', pdvId: 'pdv-sp-01', customerId: 'c1', customerName: 'Tech Solutions PJ', value: 500000,
      stageId: 'stage-won', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sp-01'], productIds: ['p1'],
      customValues: { group_number: '1020', quota_number: '55', contract_term: 180, origin_source: 'Indicação' },
      tags: [{ id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' }],
      notes: 'Cliente quer usar lance embutido. Grande oportunidade de cross-sell.',
      nextFollowUpDate: null
    },
    {
      id: 'd2', title: 'Frota Agro Sul - 2 veículos', pdvId: 'pdv-sul-01', customerId: 'c2', customerName: 'Agro Sul Ltda', value: 160000,
      stageId: 'stage-negotiation', visibility: 'RESTRICTED' as const, assignedEmployeeIds: ['rep-sul-01'], productIds: ['p3'],
      customValues: { origin_source: 'Google Ads' },
      tags: [{ id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' }, { id: 't4', label: 'Urgente', color: 'bg-orange-100 text-orange-800' }],
      notes: 'Cotando 2 cartas de auto. Cliente precisa para entrega em 60 dias.',
      nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd3', title: 'Compra iPhone Corporativo - Tech', pdvId: 'pdv-sp-02', customerId: 'c1', customerName: 'Tech Solutions PJ', value: 27000,
      stageId: 'stage-won', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['gerente-sp'], productIds: ['p6', 'p6', 'p6'],
      customValues: { sku: 'IPH15-TIT', color: 'Titânio Natural', origin_source: 'Passante', storage: '256GB' },
      tags: [],
      notes: '3 iPhones para equipe de gestão. Retirada em loja.',
      nextFollowUpDate: null
    },
    {
      id: 'd4', title: 'Imóvel Industrial Delta', pdvId: 'pdv-sp-03', customerId: 'c4', customerName: 'Construtora Delta', value: 1500000,
      stageId: 'stage-proposal', visibility: 'RESTRICTED' as const, assignedEmployeeIds: ['rep-sp-02'], productIds: ['p1'],
      customValues: { group_number: '2025', quota_number: '120', contract_term: 200, origin_source: 'Indicação' },
      tags: [{ id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' }, { id: 't7', label: 'Alto Potencial', color: 'bg-pink-100 text-pink-800' }],
      notes: 'Grande projeto de expansão industrial. Múltiplas cartas.',
      nextFollowUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd5', title: 'Consultoria Financeira Maria', pdvId: 'pdv-online-01', customerId: 'c5', customerName: 'Empresária Maria Santos', value: 2500,
      stageId: 'stage-contacted', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sp-01'], productIds: ['p9'],
      customValues: { service_type: 'Empresarial', origin_source: 'Instagram' },
      tags: [{ id: 't5', label: 'Novo Lead', color: 'bg-green-100 text-green-800' }],
      notes: 'Cliente busca planejamento para expansão do negócio.',
      nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd6', title: 'Frota Rent a Car - 10 veículos', pdvId: 'pdv-sul-02', customerId: 'c6', customerName: 'Frota Rent a Car', value: 800000,
      stageId: 'stage-lead', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sul-02'], productIds: ['p4'],
      customValues: { origin_source: 'E-mail Marketing' },
      tags: [{ id: 't3', label: 'Frio', color: 'bg-blue-100 text-blue-800' }],
      notes: 'Renovação de frota. Necessidade urgente.',
      nextFollowUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd7', title: 'Equipamentos Hospitalares', pdvId: 'pdv-ne-01', customerId: 'c7', customerName: 'Hospital São Lucas', value: 350000,
      stageId: 'stage-proposal', visibility: 'RESTRICTED' as const, assignedEmployeeIds: ['gerente-sul'], productIds: ['p8', 'p8', 'p8'],
      customValues: { origin_source: 'Telefone' },
      tags: [{ id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' }, { id: 't4', label: 'Urgente', color: 'bg-orange-100 text-orange-800' }],
      notes: 'Hospital buscando equipamentos para nova ala.',
      nextFollowUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd8', title: 'Imóvel Carlos - Reserva', pdvId: 'pdv-co-01', customerId: 'c8', customerName: 'Engenheiro Carlos Mendes', value: 350000,
      stageId: 'stage-lost', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['gerente-sp'], productIds: ['p1'],
      customValues: { origin_source: 'Google Ads' },
      tags: [],
      notes: 'Cliente desistiu por questões financeiras.',
      nextFollowUpDate: null
    },
    {
      id: 'd9', title: 'iPhones Escola Modelo - 50 unidades', pdvId: 'pdv-online-01', customerId: 'c9', customerName: 'Escola Modelo', value: 450000,
      stageId: 'stage-lost', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sp-02'], productIds: ['p6'],
      customValues: { origin_source: 'Facebook' },
      tags: [],
      notes: 'Concorrente ofereceu melhor preço.',
      nextFollowUpDate: null
    },
    {
      id: 'd10', title: 'Consórcio Auto Dra. Ana Paula', pdvId: 'pdv-sp-02', customerId: 'c10', customerName: 'Médica Dra. Ana Paula', value: 80000,
      stageId: 'stage-qualification', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sp-01'], productIds: ['p3'],
      customValues: { origin_source: 'WhatsApp' },
      tags: [{ id: 't5', label: 'Novo Lead', color: 'bg-green-100 text-green-800' }],
      notes: 'Primeiro contato realizado. Aguardando documentação.',
      nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd11', title: 'Frota Delivery - 5 vans', pdvId: 'pdv-sp-01', customerId: 'c1', customerName: 'Tech Solutions PJ', value: 400000,
      stageId: 'stage-negotiation', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sp-01'], productIds: ['p4'],
      customValues: { vehicle_type: 'Utilitário', origin_source: 'Indicação' },
      tags: [{ id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' }],
      notes: 'Expandindo operação de delivery. Precisa de 5 vans.',
      nextFollowUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd12', title: 'Consórcio Moto - Lote 20 unidades', pdvId: 'pdv-sul-01', customerId: 'c6', customerName: 'Frota Rent a Car', value: 500000,
      stageId: 'stage-proposal', visibility: 'PUBLIC' as const, assignedEmployeeIds: ['rep-sul-01'], productIds: ['p5'],
      customValues: { origin_source: 'Telefone' },
      tags: [{ id: 't7', label: 'Alto Potencial', color: 'bg-pink-100 text-pink-800' }],
      notes: ' Grande pedido para expansão de entregas rápidas.',
      nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  deals.forEach(d => {
    runQuery(`
      INSERT INTO deals (id, tenant_id, title, pdv_id, customer_id, customer_name, value, stage_id, visibility, assigned_employee_ids, product_ids, custom_values, tags, notes, next_follow_up_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      d.id, tenantId, d.title, d.pdvId || null, d.customerId, d.customerName, d.value || 0, d.stageId, d.visibility,
      JSON.stringify(d.assignedEmployeeIds || []), JSON.stringify(d.productIds || []), JSON.stringify(d.customValues || {}),
      JSON.stringify(d.tags || []), d.notes || '', d.nextFollowUpDate || null, now, now
    ]);
  });
  
  const integrations = [
    { id: 'whatsapp-1', name: 'WhatsApp Business', type: 'WHATSAPP', config: { apiUrl: 'https://api.whatsapp.com', enabled: true } },
    { id: 'email-1', name: 'E-mail Corporativo', type: 'EMAIL', config: { smtp: 'smtp.mc.com', port: 587 } },
    { id: 'gemini-1', name: 'Google Gemini AI', type: 'AI', config: { model: 'gemini-pro' } },
    { id: 'zapier-1', name: 'Zapier', type: 'INTEGRATION', config: { webhookUrl: '' } },
    { id: 'salesforce-1', name: 'Salesforce', type: 'CRM', config: { connected: false } },
  ];
  
  integrations.forEach(i => {
    runQuery(`
      INSERT INTO integrations (id, tenant_id, name, type, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'DISCONNECTED', ?, ?, ?)
    `, [i.id, tenantId, i.name, i.type, JSON.stringify(i.config), now, now]);
  });
  
  const widgets = [
    { id: 'w0', type: 'GOAL_PROGRESS', title: 'Metas do Mês', colSpan: 4, config: { goal: 1000000, current: 675000 } },
    { id: 'w1', type: 'KPI_TOTAL_SALES', title: 'Volume Geral', colSpan: 1 },
    { id: 'w2', type: 'KPI_ACTIVE_DEALS', title: 'Pipeline Ativo', colSpan: 1 },
    { id: 'w3', type: 'KPI_CONVERSION', title: 'Conversão', colSpan: 1 },
    { id: 'w4', type: 'KPI_AVG_TICKET', title: 'Ticket Médio', colSpan: 1 },
    { id: 'w5', type: 'CHART_FUNNEL', title: 'Funil de Vendas', colSpan: 2 },
    { id: 'w6', type: 'CHART_SALES_BY_REP', title: 'Ranking Equipe', colSpan: 2 },
    { id: 'w7', type: 'CHART_SALES_BY_PRODUCT', title: 'Vendas por Produto', colSpan: 2 },
    { id: 'w8', type: 'CHART_SALES_BY_REGION', title: 'Vendas por Região', colSpan: 2 },
    { id: 'w9', type: 'LIST_RECENT_DEALS', title: 'Negócios Recentes', colSpan: 4 },
    { id: 'w10', type: 'LIST_FOLLOW_UPS', title: 'Follow-ups Hoje', colSpan: 2 },
  ];
  
  widgets.forEach(w => {
    runQuery(`
      INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
    `, [w.id, tenantId, w.type, w.title, w.colSpan, JSON.stringify(w.config || {}), now, now]);
  });
  
  console.log('Tenant data seeded successfully with all modules');
}
