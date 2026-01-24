import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'database.db');

console.log('Seeding database...');

// Connect to database
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Clear existing data (optional - for fresh seeding)
db.exec(`
  DELETE FROM users;
  DELETE FROM tenants;
  DELETE FROM sessions;
  DELETE FROM preferences;
  DELETE FROM dashboard_widgets;
  DELETE FROM regions;
  DELETE FROM pdvs;
  DELETE FROM customers;
  DELETE FROM products;
  DELETE FROM pipeline_stages;
  DELETE FROM tags;
  DELETE FROM deals;
  DELETE FROM custom_field_definitions;
  DELETE FROM integrations;
  DELETE FROM widgets;
`);

// Generate IDs
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const now = new Date().toISOString();

// Create default tenant
console.log('Creating default tenant...');
const defaultTenantId = generateId();
const defaultTenant = {
  id: defaultTenantId,
  name: 'MC Investimentos Demo',
  slug: 'demo',
  createdAt: now,
  updatedAt: now
};

db.prepare(`
  INSERT INTO tenants (id, name, slug, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`).run(defaultTenant.id, defaultTenant.name, defaultTenant.slug, defaultTenant.createdAt, defaultTenant.updatedAt);

// Create default admin user
console.log('Creating default admin user...');
const defaultUserId = generateId();
const passwordHash = bcrypt.hashSync('admin123', 10); // Default password: admin123
const defaultUser = {
  id: defaultUserId,
  email: 'admin@mc.com',
  passwordHash: passwordHash,
  name: 'Diretoria (Admin)',
  role: 'ADMIN',
  isActive: 1,
  tenantId: defaultTenantId,
  createdAt: now,
  updatedAt: now
};

db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, is_active, tenant_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  defaultUser.id,
  defaultUser.email,
  defaultUser.passwordHash,
  defaultUser.name,
  defaultUser.role,
  defaultUser.isActive,
  defaultUser.tenantId,
  defaultUser.createdAt,
  defaultUser.updatedAt
);

// Create some sample regions
console.log('Creating sample regions...');
const regions = [
  { id: generateId(), name: 'North Region', tenantId: defaultTenantId },
  { id: generateId(), name: 'South Region', tenantId: defaultTenantId },
  { id: generateId(), name: 'East Region', tenantId: defaultTenantId },
  { id: generateId(), name: 'West Region', tenantId: defaultTenantId },
];

for (const region of regions) {
  db.prepare(`
    INSERT INTO regions (id, tenant_id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(region.id, region.tenantId, region.name, now, now);
}

// Create some sample PDVs
console.log('Creating sample PDVs...');
const pdvs = [
  { id: generateId(), name: 'Main Store', type: 'PHYSICAL_STORE', tenantId: defaultTenantId, regionId: regions[0].id },
  { id: generateId(), name: 'Branch Office', type: 'OFFICE', tenantId: defaultTenantId, regionId: regions[1].id },
  { id: generateId(), name: 'Online Sales', type: 'ONLINE', tenantId: defaultTenantId, regionId: null },
];

for (const pdv of pdvs) {
  db.prepare(`
    INSERT INTO pdvs (id, tenant_id, region_id, name, type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(pdv.id, pdv.tenantId, pdv.regionId, pdv.name, pdv.type, now, now);
}

// Create pipeline stages
console.log('Creating pipeline stages...');
const stages = [
  { id: generateId(), name: 'Lead', type: 'OPEN', order: 0, tenantId: defaultTenantId },
  { id: generateId(), name: 'Contacted', type: 'OPEN', order: 1, tenantId: defaultTenantId },
  { id: generateId(), name: 'Qualified', type: 'OPEN', order: 2, tenantId: defaultTenantId },
  { id: generateId(), name: 'Proposal', type: 'OPEN', order: 3, tenantId: defaultTenantId },
  { id: generateId(), name: 'Negotiation', type: 'OPEN', order: 4, tenantId: defaultTenantId },
  { id: generateId(), name: 'Won', type: 'WON', order: 5, tenantId: defaultTenantId },
  { id: generateId(), name: 'Lost', type: 'LOST', order: 6, tenantId: defaultTenantId },
];

for (const stage of stages) {
  db.prepare(`
    INSERT INTO pipeline_stages (id, tenant_id, name, type, order_val, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(stage.id, stage.tenantId, stage.name, stage.type, stage.order, now, now);
}

// Create tags
console.log('Creating tags...');
const tags = [
  { id: generateId(), label: 'Hot Lead', color: '#EF4444', tenantId: defaultTenantId },
  { id: generateId(), label: 'Cold Lead', color: '#3B82F6', tenantId: defaultTenantId },
  { id: generateId(), label: 'VIP Client', color: '#8B5CF6', tenantId: defaultTenantId },
];

for (const tag of tags) {
  db.prepare(`
    INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tag.id, tag.tenantId, tag.label, tag.color, now, now);
}

// Create sample products
console.log('Creating sample products...');
const products = [
  { id: generateId(), name: 'Basic Service Package', price: 1000, tenantId: defaultTenantId },
  { id: generateId(), name: 'Premium Service Package', price: 2500, tenantId: defaultTenantId },
  { id: generateId(), name: 'Enterprise Solution', price: 5000, tenantId: defaultTenantId },
];

for (const product of products) {
  db.prepare(`
    INSERT INTO products (id, tenant_id, name, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(product.id, product.tenantId, product.name, product.price, now, now);
}

// Create sample customers
console.log('Creating sample customers...');
const customers = [
  { id: generateId(), name: 'John Doe', type: 'PF', email: 'john@example.com', phone: '+1234567890', status: 'LEAD', tenantId: defaultTenantId },
  { id: generateId(), name: 'Acme Corporation', type: 'PJ', email: 'contact@acme.com', phone: '+1987654321', status: 'ACTIVE', tenantId: defaultTenantId },
  { id: generateId(), name: 'Jane Smith', type: 'PF', email: 'jane@example.com', phone: '+1122334455', status: 'PROSPECT', tenantId: defaultTenantId },
];

for (const customer of customers) {
  db.prepare(`
    INSERT INTO customers (id, tenant_id, name, type, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(customer.id, customer.tenantId, customer.name, customer.type, customer.email, customer.phone, customer.status, now, now);
}

// Create sample deals
console.log('Creating sample deals...');
const deals = [
  { id: generateId(), title: 'New Service Contract', value: 2500, tenantId: defaultTenantId, customerId: customers[1].id, stageId: stages[5].id, pdvId: pdvs[0].id },
  { id: generateId(), title: 'Consulting Project', value: 1500, tenantId: defaultTenantId, customerId: customers[0].id, stageId: stages[3].id, pdvId: pdvs[1].id },
  { id: generateId(), title: 'Software License', value: 5000, tenantId: defaultTenantId, customerId: customers[1].id, stageId: stages[4].id, pdvId: pdvs[2].id },
];

for (const deal of deals) {
  db.prepare(`
    INSERT INTO deals (id, tenant_id, customer_id, stage_id, pdv_id, title, value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(deal.id, deal.tenantId, deal.customerId, deal.stageId, deal.pdvId, deal.title, deal.value, now, now);
}

// Create custom field definitions
console.log('Creating custom field definitions...');
const customFields = [
  { id: generateId(), entity: 'CUSTOMER', fieldKey: 'source', label: 'Lead Source', type: 'TEXT', tenantId: defaultTenantId },
  { id: generateId(), entity: 'DEAL', fieldKey: 'expected_close_date', label: 'Expected Close Date', type: 'DATE', tenantId: defaultTenantId },
  { id: generateId(), entity: 'CUSTOMER', fieldKey: 'industry', label: 'Industry', type: 'SELECT', options: '["Technology", "Healthcare", "Finance", "Retail"]', tenantId: defaultTenantId },
];

for (const field of customFields) {
  db.prepare(`
    INSERT INTO custom_field_definitions (id, tenant_id, entity, field_key, label, type, options, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(field.id, field.tenantId, field.entity, field.fieldKey, field.label, field.type, field.options, now, now);
}

// Create integrations
console.log('Creating integrations...');
const integrations = [
  { id: generateId(), name: 'Email Integration', type: 'EMAIL', status: 'ACTIVE', tenantId: defaultTenantId },
  { id: generateId(), name: 'SMS Gateway', type: 'SMS', status: 'ACTIVE', tenantId: defaultTenantId },
];

for (const integration of integrations) {
  db.prepare(`
    INSERT INTO integrations (id, tenant_id, name, type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(integration.id, integration.tenantId, integration.name, integration.type, integration.status, now, now);
}

// Create widgets
console.log('Creating dashboard widgets...');
const widgets = [
  { id: generateId(), name: 'Sales Overview', type: 'CHART', tenantId: defaultTenantId },
  { id: generateId(), name: 'Recent Activity', type: 'LIST', tenantId: defaultTenantId },
  { id: generateId(), name: 'Top Performers', type: 'TABLE', tenantId: defaultTenantId },
];

for (const widget of widgets) {
  db.prepare(`
    INSERT INTO widgets (id, tenant_id, name, type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(widget.id, widget.tenantId, widget.name, widget.type, now, now);
}

console.log('Database seeded successfully!');
console.log('');
console.log('Default credentials:');
console.log('  Email: admin@mc.com');
console.log('  Password: admin123');
console.log('  Company: MC Investimentos Demo');

// Close the database connection
db.close();

console.log('Seeding completed.');