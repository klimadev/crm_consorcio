import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'database.db');

console.log('='.repeat(60));
console.log('🌱 SEEDING DATABASE WITH REALISTIC DATA');
console.log('='.repeat(60));

// Connect to database
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Temporarily disable foreign keys to avoid seed order issues
db.pragma('foreign_keys = OFF');

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getRandomDate(daysAgo: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

const passwordHash = bcrypt.hashSync('admin123', 10);

try {
  // Clear existing data
  console.log('\n🧹 Clearing existing data...');
  db.exec(`
    DELETE FROM deals;
    DELETE FROM customers;
    DELETE FROM products;
    DELETE FROM tags;
    DELETE FROM pipeline_stages;
    DELETE FROM pdvs;
    DELETE FROM regions;
    DELETE FROM dashboard_widgets;
    DELETE FROM custom_field_definitions;
    DELETE FROM integrations;
    DELETE FROM preferences;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM tenants;
  `);
  console.log('✅ Data cleared');

  // =====================================================
  // 1. TENANT
  // =====================================================
  console.log('\n🏢 Creating tenant...');
  const tenantId = generateId();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenantId, 'MC Investimentos', 'mc-investimentos', now, now);
  console.log('✅ Tenant: MC Investimentos');

  // =====================================================
  // 2. REGIONS (5)
  // =====================================================
  console.log('\n🗺️  Creating regions...');
  const regions = [
    { id: generateId(), name: 'Sudeste' },
    { id: generateId(), name: 'Sul' },
    { id: generateId(), name: 'Nordeste' },
    { id: generateId(), name: 'Centro-Oeste' },
    { id: generateId(), name: 'Norte' },
  ];

  for (const region of regions) {
    db.prepare(`
      INSERT INTO regions (id, tenant_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(region.id, tenantId, region.name, now, now);
  }
  console.log(`✅ ${regions.length} regions created`);

  // =====================================================
  // 3. PDVs (14)
  // =====================================================
  console.log('\n🏪 Creating PDVs...');
  const pdvs = [
    { id: generateId(), name: 'São Paulo - Centro', type: 'PHYSICAL_STORE', regionId: regions[0].id, city: 'São Paulo', state: 'SP' },
    { id: generateId(), name: 'São Paulo - Shopping Morumbi', type: 'PHYSICAL_STORE', regionId: regions[0].id, city: 'São Paulo', state: 'SP' },
    { id: generateId(), name: 'Rio de Janeiro - Shopping', type: 'PHYSICAL_STORE', regionId: regions[0].id, city: 'Rio de Janeiro', state: 'RJ' },
    { id: generateId(), name: 'Rio de Janeiro - Copacabana', type: 'PHYSICAL_STORE', regionId: regions[0].id, city: 'Rio de Janeiro', state: 'RJ' },
    { id: generateId(), name: 'Belo Horizonte - Centro', type: 'PHYSICAL_STORE', regionId: regions[0].id, city: 'Belo Horizonte', state: 'MG' },
    { id: generateId(), name: 'Curitiba - Shopping', type: 'PHYSICAL_STORE', regionId: regions[1].id, city: 'Curitiba', state: 'PR' },
    { id: generateId(), name: 'Porto Alegre - Centro', type: 'PHYSICAL_STORE', regionId: regions[1].id, city: 'Porto Alegre', state: 'RS' },
    { id: generateId(), name: 'Salvador - Shopping', type: 'PHYSICAL_STORE', regionId: regions[2].id, city: 'Salvador', state: 'BA' },
    { id: generateId(), name: 'Recife - Centro', type: 'PHYSICAL_STORE', regionId: regions[2].id, city: 'Recife', state: 'PE' },
    { id: generateId(), name: 'Brasília - Shopping', type: 'PHYSICAL_STORE', regionId: regions[3].id, city: 'Brasília', state: 'DF' },
    { id: generateId(), name: 'Manaus - Centro', type: 'PHYSICAL_STORE', regionId: regions[4].id, city: 'Manaus', state: 'AM' },
    { id: generateId(), name: 'Belém - Shopping', type: 'PHYSICAL_STORE', regionId: regions[4].id, city: 'Belém', state: 'PA' },
    { id: generateId(), name: 'Loja Online Nacional', type: 'ONLINE', regionId: null, city: 'Brasil', state: 'BR' },
    { id: generateId(), name: 'Call Center Central', type: 'CALL_CENTER', regionId: null, city: 'São Paulo', state: 'SP' },
  ];

  for (const pdv of pdvs) {
    db.prepare(`
      INSERT INTO pdvs (id, tenant_id, region_id, name, type, location, address, city, state, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pdv.id, tenantId, pdv.regionId, pdv.name, pdv.type, 
      `${pdv.city}/${pdv.state}`, `${pdv.name} - Endereço Comercial`, 
      pdv.city, pdv.state, 1, now, now
    );
  }
  console.log(`✅ ${pdvs.length} PDVs created`);

  // =====================================================
  // 4. USERS (12)
  // =====================================================
  console.log('\n👥 Creating users...');
  
  const spCentroId = pdvs[0].id;
  const rjShoppingId = pdvs[2].id;
  const bhCentroId = pdvs[4].id;

  const users = [
    { id: generateId(), name: 'Diretoria', email: 'admin@mc.com', role: 'ADMIN', pdvId: null },
    { id: generateId(), name: 'Carlos Silva', email: 'carlos.silva@mc.com', role: 'MANAGER', pdvId: spCentroId },
    { id: generateId(), name: 'Ana Paula', email: 'ana.paula@mc.com', role: 'MANAGER', pdvId: rjShoppingId },
    { id: generateId(), name: 'Mariana Lima', email: 'mariana.lima@mc.com', role: 'MANAGER', pdvId: bhCentroId },
    { id: generateId(), name: 'João Santos', email: 'joao.vendedor@mc.com', role: 'SALES_REP', pdvId: spCentroId },
    { id: generateId(), name: 'Maria Oliveira', email: 'maria.vendedora@mc.com', role: 'SALES_REP', pdvId: spCentroId },
    { id: generateId(), name: 'Pedro Costa', email: 'pedro.vendedor@mc.com', role: 'SALES_REP', pdvId: rjShoppingId },
    { id: generateId(), name: 'Juliana Mendes', email: 'juliana.vendedora@mc.com', role: 'SALES_REP', pdvId: rjShoppingId },
    { id: generateId(), name: 'Fernando Souza', email: 'fernando.vendedor@mc.com', role: 'SALES_REP', pdvId: bhCentroId },
    { id: generateId(), name: 'Amanda Ferreira', email: 'amanda.vendedora@mc.com', role: 'SALES_REP', pdvId: bhCentroId },
    { id: generateId(), name: 'Roberto Almeida', email: 'roberto.suporte@mc.com', role: 'SUPPORT', pdvId: null },
    { id: generateId(), name: 'Patrícia Rocha', email: 'patricia.suporte@mc.com', role: 'SUPPORT', pdvId: null },
  ];

  const salesRepIds = users.filter(u => u.role === 'SALES_REP').map(u => u.id);

  for (const user of users) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, is_active, tenant_id, pdv_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.email, passwordHash, user.name, user.role, 1, tenantId, user.pdvId, now, now);
  }
  console.log(`✅ ${users.length} users created`);

  // =====================================================
  // 5. PIPELINE STAGES (7)
  // =====================================================
  console.log('\n🎯 Creating pipeline stages...');
  const stages = [
    { id: generateId(), name: 'Novo Lead', type: 'OPEN', color: '#9CA3AF', order: 0 },
    { id: generateId(), name: 'Contato Inicial', type: 'OPEN', color: '#3B82F6', order: 1 },
    { id: generateId(), name: 'Qualificado', type: 'OPEN', color: '#8B5CF6', order: 2 },
    { id: generateId(), name: 'Proposta Enviada', type: 'OPEN', color: '#F59E0B', order: 3 },
    { id: generateId(), name: 'Em Negociação', type: 'OPEN', color: '#EC4899', order: 4 },
    { id: generateId(), name: 'Contrato Fechado', type: 'WON', color: '#10B981', order: 5 },
    { id: generateId(), name: 'Perdido', type: 'LOST', color: '#EF4444', order: 6 },
  ];

  for (const stage of stages) {
    db.prepare(`
      INSERT INTO pipeline_stages (id, tenant_id, name, color, type, automation_steps, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(stage.id, tenantId, stage.name, stage.color, stage.type, '[]', stage.order, now, now);
  }
  console.log(`✅ ${stages.length} pipeline stages created`);

  // =====================================================
  // 6. TAGS (4)
  // =====================================================
  console.log('\n🏷️  Creating tags...');
  const tags = [
    { id: generateId(), label: 'Hot Lead', color: '#EF4444' },
    { id: generateId(), label: 'Cliente VIP', color: '#8B5CF6' },
    { id: generateId(), label: 'Recorrência', color: '#10B981' },
    { id: generateId(), label: 'Pós-Venda', color: '#F59E0B' },
  ];

  for (const tag of tags) {
    db.prepare(`
      INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tag.id, tenantId, tag.label, tag.color, now, now);
  }
  console.log(`✅ ${tags.length} tags created`);

  // =====================================================
  // 7. PRODUCTS (5)
  // =====================================================
  console.log('\n📦 Creating products...');
  const products = [
    { id: generateId(), name: 'Consórcio de Imóvel', category: 'IMOVEIS', basePrice: 150000, description: 'Consórcio contemplação imóvel residencial/comercial', followUpDays: 7 },
    { id: generateId(), name: 'Consórcio de Veículo', category: 'VEICULOS', basePrice: 50000, description: 'Consórcio contemplação veículo 0km/seminovo', followUpDays: 5 },
    { id: generateId(), name: 'Crédito Pessoal', category: 'CREDITO', basePrice: 10000, description: 'Crédito pessoal sem garantia', followUpDays: 3 },
    { id: generateId(), name: 'Financiamento de Veículo', category: 'VEICULOS', basePrice: 40000, description: 'Financiamento bancário veículo', followUpDays: 5 },
    { id: generateId(), name: 'Consórcio de Serviços', category: 'SERVICOS', basePrice: 20000, description: 'Consórcio para serviços e reformas', followUpDays: 7 },
  ];

  for (const product of products) {
    db.prepare(`
      INSERT INTO products (id, tenant_id, name, description, category, base_price, price, attributes, form_schema, automation_steps, default_follow_up_days, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.id, tenantId, product.name, product.description, product.category,
      product.basePrice, product.basePrice, '[]', '[]', '[]', product.followUpDays, 1, now, now
    );
  }
  console.log(`✅ ${products.length} products created`);

  // =====================================================
  // 8. CUSTOM FIELD DEFINITIONS (6)
  // =====================================================
  console.log('\n📝 Creating custom field definitions...');
  const customFields = [
    { id: generateId(), key: 'origem_lead', label: 'Origem do Lead', type: 'select', scope: 'CUSTOMER', options: JSON.stringify(['Site', 'Facebook', 'Instagram', 'Indicação', 'Loja', 'Telefone', 'Whatsapp']) },
    { id: generateId(), key: 'renda_mensal', label: 'Renda Mensal (R$)', type: 'number', scope: 'CUSTOMER', options: '[]' },
    { id: generateId(), key: 'score_credito', label: 'Score de Crédito', type: 'number', scope: 'CUSTOMER', options: '[]' },
    { id: generateId(), key: 'possui_restricao', label: 'Possui Restrição', type: 'boolean', scope: 'CUSTOMER', options: '[]' },
    { id: generateId(), key: 'data_contemplacao', label: 'Data Pretendida Contemplação', type: 'date', scope: 'DEAL', options: '[]' },
    { id: generateId(), key: 'observacoes_internas', label: 'Observações Internas', type: 'text', scope: 'DEAL', options: '[]' },
  ];

  for (const field of customFields) {
    db.prepare(`
      INSERT INTO custom_field_definitions (id, tenant_id, key, label, type, scope, options, required, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(field.id, tenantId, field.key, field.label, field.type, field.scope, field.options, 0, 1, now, now);
  }
  console.log(`✅ ${customFields.length} custom fields created`);

  // =====================================================
  // 9. CUSTOMERS (30)
  // =====================================================
  console.log('\n👤 Creating customers...');
  
  const customerPFs = [
    { name: 'Roberto Silva', document: '123.456.789-00', email: 'roberto.silva@email.com', phone: '(11) 98765-4321' },
    { name: 'Ana Costa', document: '234.567.890-11', email: 'ana.costa@email.com', phone: '(11) 97654-3210' },
    { name: 'Carlos Mendes', document: '345.678.901-22', email: 'carlos.mendes@email.com', phone: '(21) 96543-2109' },
    { name: 'Maria Santos', document: '456.789.012-33', email: 'maria.santos@email.com', phone: '(21) 95432-1098' },
    { name: 'João Oliveira', document: '567.890.123-44', email: 'joao.oliveira@email.com', phone: '(31) 94321-0987' },
    { name: 'Fernanda Lima', document: '678.901.234-55', email: 'fernanda.lima@email.com', phone: '(31) 93210-9876' },
    { name: 'Pedro Almeida', document: '789.012.345-66', email: 'pedro.almeida@email.com', phone: '(41) 92109-8765' },
    { name: 'Juliana Rodrigues', document: '890.123.456-77', email: 'juliana.rodrigues@email.com', phone: '(41) 91098-7654' },
    { name: 'Marcos Souza', document: '901.234.567-88', email: 'marcos.souza@email.com', phone: '(51) 90987-6543' },
    { name: 'Camila Ferreira', document: '012.345.678-99', email: 'camila.ferreira@email.com', phone: '(51) 99876-5432' },
    { name: 'Ricardo Gomes', document: '111.222.333-44', email: 'ricardo.gomes@email.com', phone: '(71) 98765-4321' },
    { name: 'Patrícia Moura', document: '222.333.444-55', email: 'patricia.moura@email.com', phone: '(71) 97654-3210' },
    { name: 'Bruno Rocha', document: '333.444.555-66', email: 'bruno.rocha@email.com', phone: '(81) 96543-2109' },
    { name: 'Larissa Castro', document: '444.555.666-77', email: 'larissa.castro@email.com', phone: '(81) 95432-1098' },
    { name: 'Gabriel Martins', document: '555.666.777-88', email: 'gabriel.martins@email.com', phone: '(61) 94321-0987' },
    { name: 'Beatriz Nunes', document: '666.777.888-99', email: 'beatriz.nunes@email.com', phone: '(61) 93210-9876' },
    { name: 'Lucas Araújo', document: '777.888.999-00', email: 'lucas.araujo@email.com', phone: '(92) 92109-8765' },
    { name: 'Vanessa Cardoso', document: '888.999.000-11', email: 'vanessa.cardoso@email.com', phone: '(92) 91098-7654' },
    { name: 'Diego Barbosa', document: '999.000.111-22', email: 'diego.barbosa@email.com', phone: '(91) 90987-6543' },
    { name: 'Amanda Teixeira', document: '000.111.222-33', email: 'amanda.teixeira@email.com', phone: '(91) 99876-5432' },
  ];

  const customerPJs = [
    { name: 'Comércio Silva Ltda', document: '12.345.678/0001-90', email: 'contato@comerciosilva.com.br', phone: '(11) 3456-7890' },
    { name: 'Construtora Horizonte S.A.', document: '23.456.789/0001-01', email: 'vendas@horizonte.com.br', phone: '(21) 3456-7890' },
    { name: 'Farmácia Popular', document: '34.567.890/0001-12', email: 'compras@farmaciaspop.com.br', phone: '(31) 3456-7890' },
    { name: 'Auto Peças Central', document: '45.678.901/0001-23', email: 'pecas@autocentral.com.br', phone: '(41) 3456-7890' },
    { name: 'Restaurante Sabor Caseiro', document: '56.789.012/0001-34', email: 'contato@saborcaseiro.com.br', phone: '(51) 3456-7890' },
    { name: 'Imobiliária União', document: '67.890.123/0001-45', email: 'imoveis@uniaoimoveis.com.br', phone: '(71) 3456-7890' },
    { name: 'Transportadora Rápida', document: '78.901.234/0001-56', email: 'logistica@rapidatrans.com.br', phone: '(81) 3456-7890' },
    { name: 'Clínica Médica Vida', document: '89.012.345/0001-67', email: 'agendamento@clinicavida.com.br', phone: '(61) 3456-7890' },
    { name: 'Loja de Móveis Modernos', document: '90.123.456/0001-78', email: 'vendas@moveismodernos.com.br', phone: '(92) 3456-7890' },
    { name: 'Padaria Pão Quente', document: '01.234.567/0001-89', email: 'encomendas@paoquente.com.br', phone: '(91) 3456-7890' },
  ];

  const customerStatuses: Array<'LEAD' | 'PROPONENT' | 'PENDING' | 'ACTIVE' | 'DEFAULTING' | 'CHURN'> = 
    ['LEAD', 'PROPONENT', 'PENDING', 'ACTIVE', 'DEFAULTING', 'CHURN'];
  
  const origens = ['Site', 'Facebook', 'Instagram', 'Indicação', 'Loja', 'Telefone'];

  const customers: Array<{id: string, name: string, type: string, document: string, email: string, phone: string, status: string, customValues: object}> = [];

  // Create PF customers
  for (let i = 0; i < customerPFs.length; i++) {
    const data = customerPFs[i];
    const id = generateId();
    const status = customerStatuses[Math.floor(Math.random() * customerStatuses.length)];
    const customValues = {
      origem_lead: origens[Math.floor(Math.random() * origens.length)],
      renda_mensal: Math.floor(Math.random() * 15000) + 2000,
      score_credito: Math.floor(Math.random() * 400) + 500,
      possui_restricao: Math.random() > 0.8
    };

    db.prepare(`
      INSERT INTO customers (id, tenant_id, region_id, pdv_id, name, type, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, tenantId, null, null, data.name, 'PF', data.document, data.email, data.phone,
      '00000-000', status, '[]', '[]', JSON.stringify(customValues), getRandomDate(180), now
    );

    customers.push({ id, name: data.name, type: 'PF', document: data.document, email: data.email, phone: data.phone, status, customValues });
  }

  // Create PJ customers
  for (let i = 0; i < customerPJs.length; i++) {
    const data = customerPJs[i];
    const id = generateId();
    const status = customerStatuses[Math.floor(Math.random() * customerStatuses.length)];
    const customValues = {
      origem_lead: origens[Math.floor(Math.random() * origens.length)],
      renda_mensal: Math.floor(Math.random() * 100000) + 20000,
      score_credito: Math.floor(Math.random() * 300) + 600,
      possui_restricao: Math.random() > 0.9
    };

    db.prepare(`
      INSERT INTO customers (id, tenant_id, region_id, pdv_id, name, type, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, tenantId, null, null, data.name, 'PJ', data.document, data.email, data.phone,
      '00000-000', status, '[]', '[]', JSON.stringify(customValues), getRandomDate(180), now
    );

    customers.push({ id, name: data.name, type: 'PJ', document: data.document, email: data.email, phone: data.phone, status, customValues });
  }

  console.log(`✅ ${customers.length} customers created (${customerPFs.length} PF + ${customerPJs.length} PJ)`);

  // =====================================================
  // 10. DEALS (40)
  // =====================================================
  console.log('\n💼 Creating deals...');
  
  const dealTitles = [
    'Consórcio Imóvel',
    'Consórcio Veículo',
    'Crédito Pessoal',
    'Financiamento Veículo',
    'Consórcio Serviços',
    'Refinanciamento Imóvel',
    'Carta de Crédito',
    'Consórcio Contemplado',
  ];

  const openStageIds = stages.filter(s => s.type === 'OPEN').map(s => s.id);
  const wonStageId = stages.find(s => s.type === 'WON')!.id;
  const lostStageId = stages.find(s => s.type === 'LOST')!.id;

  const dealsDistribution = [
    ...Array(10).fill(null).map(() => ({ stageIndex: 0 })), // Novo Lead
    ...Array(8).fill(null).map(() => ({ stageIndex: 1 })), // Contato Inicial
    ...Array(7).fill(null).map(() => ({ stageIndex: 2 })), // Qualificado
    ...Array(6).fill(null).map(() => ({ stageIndex: 3 })), // Proposta Enviada
    ...Array(4).fill(null).map(() => ({ stageIndex: 4 })), // Em Negociação
    ...Array(8).fill(null).map(() => ({ stageIndex: 5 })), // Contrato Fechado (WON)
    ...Array(5).fill(null).map(() => ({ stageIndex: 6 })), // Perdido (LOST)
  ];

  let totalWonValue = 0;
  let wonCount = 0;

  for (let i = 0; i < dealsDistribution.length; i++) {
    const dist = dealsDistribution[i];
    const stage = stages[dist.stageIndex];
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const pdv = pdvs[Math.floor(Math.random() * (pdvs.length - 2))]; // Exclude online/call center sometimes
    const assignedReps = [salesRepIds[Math.floor(Math.random() * salesRepIds.length)]];
    const title = `${dealTitles[Math.floor(Math.random() * dealTitles.length)]} - ${customer.name.split(' ')[0]}`;
    const value = Math.floor(Math.random() * 20) * 5000 + 5000; // 5k to 105k
    const createdAt = getRandomDate(90);
    const tagsJson = JSON.stringify(Math.random() > 0.5 ? [tags[0].id] : []);
    const notes = `Negociação iniciada em ${new Date(createdAt).toLocaleDateString('pt-BR')}. Cliente demonstra interesse em ${product.name.toLowerCase()}.`;
    const nextFollowUp = getFutureDate(Math.floor(Math.random() * 14) + 1);
    const customValues = {
      data_contemplacao: getFutureDate(Math.floor(Math.random() * 180) + 30).split('T')[0],
      observacoes_internas: Math.random() > 0.7 ? 'Cliente precisa de documentação complementar' : ''
    };

    db.prepare(`
      INSERT INTO deals (id, tenant_id, customer_id, customer_name, pdv_id, product_id, stage_id, title, value, visibility, assigned_employee_ids, product_ids, custom_values, tags, notes, next_follow_up_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(), tenantId, customer.id, customer.name, pdv.id, product.id, stage.id,
      title, value, 'PUBLIC', JSON.stringify(assignedReps), JSON.stringify([product.id]),
      JSON.stringify(customValues), tagsJson, notes, nextFollowUp, createdAt, now
    );

    if (stage.type === 'WON') {
      totalWonValue += value;
      wonCount++;
    }
  }

  console.log(`✅ ${dealsDistribution.length} deals created`);
  console.log(`   📊 ${wonCount} vendas fechadas = R$ ${totalWonValue.toLocaleString('pt-BR')}`);

  // =====================================================
  // 11. INTEGRATIONS (3)
  // =====================================================
  console.log('\n🔌 Creating integrations...');
  const integrations = [
    { id: generateId(), name: 'WhatsApp Business', type: 'WHATSAPP', status: 'DISCONNECTED' },
    { id: generateId(), name: 'Email Marketing', type: 'EMAIL', status: 'DISCONNECTED' },
    { id: generateId(), name: 'SMS Gateway', type: 'SMS', status: 'ACTIVE' },
  ];

  for (const integration of integrations) {
    db.prepare(`
      INSERT INTO integrations (id, tenant_id, name, type, status, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(integration.id, tenantId, integration.name, integration.type, integration.status, '{}', now, now);
  }
  console.log(`✅ ${integrations.length} integrations created`);

  // =====================================================
  // 12. DASHBOARD WIDGETS (4)
  // =====================================================
  console.log('\n📊 Creating dashboard widgets...');
  const adminUser = users.find(u => u.role === 'ADMIN')!;
  
  const widgets = [
    { id: generateId(), type: 'sales_summary', title: 'Resumo de Vendas', colSpan: 2 },
    { id: generateId(), type: 'ranking', title: 'Ranking de Vendedores', colSpan: 1 },
    { id: generateId(), type: 'pipeline', title: 'Negócios por Etapa', colSpan: 1 },
    { id: generateId(), type: 'goals', title: 'Meta Mensal', colSpan: 1 },
  ];

  for (const widget of widgets) {
    const config = JSON.stringify({
      showValues: true,
      period: 'month',
      chartType: widget.type === 'sales_summary' ? 'line' : 'bar'
    });
    
    db.prepare(`
      INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(widget.id, tenantId, adminUser.id, widget.type, widget.title, widget.colSpan, config, now, now);
  }
  console.log(`✅ ${widgets.length} dashboard widgets created`);

  // =====================================================
  // DONE
  // =====================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📋 SUMMARY:');
  console.log(`   🏢 1 Tenant: MC Investimentos`);
  console.log(`   🗺️  5 Regions`);
  console.log(`   🏪 14 PDVs`);
  console.log(`   👥 12 Users (ADMIN: 1, MANAGER: 3, SALES_REP: 6, SUPPORT: 2)`);
  console.log(`   🎯 7 Pipeline Stages`);
  console.log(`   🏷️  4 Tags`);
  console.log(`   📦 5 Products`);
  console.log(`   📝 6 Custom Fields`);
  console.log(`   👤 30 Customers (20 PF + 10 PJ)`);
  console.log(`   💼 40 Deals distributed in pipeline`);
  console.log(`   🔌 3 Integrations`);
  console.log(`   📊 4 Dashboard Widgets`);
  console.log('\n🔑 DEFAULT LOGIN:');
  console.log('   Email: admin@mc.com');
  console.log('   Password: admin123');
  console.log('\n🎭 OTHER USERS (same password: admin123):');
  console.log('   carlos.silva@mc.com (MANAGER - SP)');
  console.log('   ana.paula@mc.com (MANAGER - RJ)');
  console.log('   joao.vendedor@mc.com (SALES_REP - SP)');
  console.log('   pedro.vendedor@mc.com (SALES_REP - RJ)');
  console.log('   + 8 more users...');
  console.log('\n' + '='.repeat(60));

} catch (error) {
  console.error('\n❌ ERROR SEEDING DATABASE:', error);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
