const { getDb, generateId, closeDb } = require('../src/lib/db/index.ts');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  const db = getDb();
  console.log('🌱 Starting database seed...\n');

  // Clean up existing data
  db.exec('DELETE FROM deals; DELETE FROM customers; DELETE FROM products; DELETE FROM tags; DELETE FROM pipeline_stages; DELETE FROM pdvs; DELETE FROM regions; DELETE FROM users; DELETE FROM tenants;');

  const passwordHash = bcrypt.hashSync('admin123', 12);
  const now = new Date().toISOString();

  console.log('1. Creating tenant...');
  const tenantId = generateId();
  db.prepare(`
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenantId, 'MC I Demo', 'demo', now, now);
  console.log(`   Created tenant: MC I Demo (demo)\n`);

  console.log('2. Creating admin user...');
  const adminId = generateId();
   db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, active, tenant_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(adminId, 'admin@mc.com', passwordHash, 'Diretoria (Admin)', 'ADMIN', tenantId, now, now);
  console.log(`   Created user: admin@mc.com\n`);

  console.log('3. Creating regions...');
  const regions = [
    { id: generateId(), name: 'São Paulo' },
    { id: generateId(), name: 'Paraná' },
  ];
  for (const r of regions) {
    db.prepare(`INSERT INTO regions (id, tenant_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(r.id, tenantId, r.name, now, now);
  }
  console.log(`   Created ${regions.length} regions\n`);

  console.log('4. Creating PDVs...');
  const pdvs = [
    { id: generateId(), name: 'Loja Berrini (SP)', type: 'LOJA', regionId: regions[0].id, city: 'São Paulo', state: 'SP' },
    { id: generateId(), name: 'Quiosque Morumbi', type: 'QUIOSQUE', regionId: regions[0].id, city: 'São Paulo', state: 'SP' },
    { id: generateId(), name: 'Filial Curitiba', type: 'LOJA', regionId: regions[1].id, city: 'Curitiba', state: 'PR' },
  ];
  for (const p of pdvs) {
    db.prepare(`INSERT INTO pdvs (id, tenant_id, region_id, name, type, city, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(p.id, tenantId, p.regionId, p.name, p.type, p.city, p.state, now, now);
  }
  console.log(`   Created ${pdvs.length} PDVs\n`);

  console.log('5. Creating pipeline stages...');
  const stages = ['Prospecção', 'Qualificação', 'Apresentação', 'Fechamento', 'Vendido', 'Perdido'];
  const stageTypes = ['OPEN', 'OPEN', 'OPEN', 'OPEN', 'WON', 'LOST'];
  const stageIds = [];
  for (let i = 0; i < stages.length; i++) {
    const stageId = generateId();
    stageIds.push(stageId);
    db.prepare(`INSERT INTO pipeline_stages (id, tenant_id, name, type, order_val, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(stageId, tenantId, stages[i], stageTypes[i], i, now, now);
  }
  console.log(`   Created ${stages.length} stages\n`);

  console.log('6. Creating tags...');
  const tags = [
    { id: generateId(), label: 'VIP', color: '#F59E0B' },
    { id: generateId(), label: 'Quente', color: '#EF4444' },
    { id: generateId(), label: 'Frio', color: '#3B82F6' },
  ];
  for (const t of tags) {
    db.prepare(`INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(t.id, tenantId, t.label, t.color, now, now);
  }
  console.log(`   Created ${tags.length} tags\n`);

  console.log('7. Creating products...');
  const products = [
    { id: generateId(), name: 'Consórcio Auto 80k', sku: 'CONS-AUTO-80', price: 80000 },
    { id: generateId(), name: 'Carta Imóvel 500k', sku: 'CONS-IMOV-500', price: 500000 },
    { id: generateId(), name: 'iPhone 15 Pro Max', sku: 'IPH-15-PM', price: 9000 },
  ];
  for (const p of products) {
    db.prepare(`INSERT INTO products (id, tenant_id, name, sku, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(p.id, tenantId, p.name, p.sku, p.price, now, now);
  }
  console.log(`   Created ${products.length} products\n`);

  console.log('8. Creating customers...');
  const customers = [
    { id: generateId(), name: 'Tech Solutions PJ', type: 'PJ', document: '12.345.678/0001-90', email: 'contato@tech.com', phone: '11999999999', status: 'ATIVO', regionId: regions[0].id, pdvId: pdvs[0].id },
    { id: generateId(), name: 'Agro Sul Ltda', type: 'PJ', document: '98.765.432/0001-10', email: 'comercial@agrosul.com', phone: '41488888888', status: 'EM_APROVACAO', regionId: regions[1].id, pdvId: pdvs[2].id },
    { id: generateId(), name: 'Investidor João', type: 'PF', document: '123.456.789-00', email: 'joao@gmail.com', phone: '11988887777', status: 'LEAD', regionId: regions[0].id, pdvId: pdvs[0].id },
  ];
  for (const c of customers) {
    db.prepare(`INSERT INTO customers (id, tenant_id, region_id, pdv_id, name, type, document, email, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.id, tenantId, c.regionId, c.pdvId, c.name, c.type, c.document, c.email, c.phone, c.status, now, now);
  }
  console.log(`   Created ${customers.length} customers\n`);

  console.log('9. Creating deals...');
  db.prepare(`INSERT INTO deals (id, tenant_id, customer_id, pdv_id, product_id, stage_id, title, value, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), tenantId, customers[0].id, pdvs[0].id, products[1].id, stageIds[4], 'Expansão Sede Tech', 500000, JSON.stringify([tags[0].id]), now, now);
  db.prepare(`INSERT INTO deals (id, tenant_id, customer_id, pdv_id, product_id, stage_id, title, value, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), tenantId, customers[1].id, pdvs[2].id, products[0].id, stageIds[2], 'Frota Agro Sul', 160000, JSON.stringify([tags[1].id]), now, now);
  db.prepare(`INSERT INTO deals (id, tenant_id, customer_id, pdv_id, product_id, stage_id, title, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), tenantId, customers[2].id, pdvs[1].id, products[2].id, stageIds[4], 'Compra iPhone Corporativo', 9000, now, now);
  console.log('   Created 3 deals\n');

  console.log('10. Creating dashboard widgets...');
  db.prepare(`INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), adminId, 'kpi_total_sales', JSON.stringify({ title: 'Vendas Totais', icon: 'DollarSign', color: 'emerald' }), 0, 'small', now, now);
  db.prepare(`INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), adminId, 'kpi_active_deals', JSON.stringify({ title: 'Negócios Ativos', icon: 'TrendingUp', color: 'blue' }), 1, 'small', now, now);
  db.prepare(`INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), adminId, 'kpi_conversion_rate', JSON.stringify({ title: 'Taxa de Conversão', icon: 'Target', color: 'purple' }), 2, 'small', now, now);
  db.prepare(`INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(generateId(), adminId, 'funnel', JSON.stringify({ title: 'Funil de Vendas' }), 3, 'large', now, now);
  console.log('   Created 4 dashboard widgets\n');

  console.log('✅ Seed completed successfully!\n');
  console.log('Demo credentials:');
  console.log('  Organization: demo');
  console.log('  Email: admin@mc.com');
  console.log('  Password: admin123\n');

  closeDb();
}

seedDatabase();
