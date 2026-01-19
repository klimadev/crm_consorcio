import { getDb, closeDb, runQuery, getOneQuery, generateId } from '../src/lib/db/index.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Initializing database...');
  const db = await getDb();
  console.log('Database initialized');

  const now = new Date().toISOString();
  const tenantId = generateId();
  
  console.log('Creating tenant...');
  runQuery(`
    INSERT INTO tenants (id, name, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `, [tenantId, 'MC Investimentos Demo', 'demo', now, now]);

  const users = [
    { email: 'admin@mc.com', name: 'Diretoria (Admin)', role: 'ADMIN', pdvId: null, password: 'admin123' },
    { email: 'roberto@mc.com', name: 'Roberto (Gerente SP)', role: 'MANAGER', pdvId: 'pdv-sp-01', password: 'roberto123' },
    { email: 'ana@mc.com', name: 'Ana (Vendedora SP)', role: 'SALES_REP', pdvId: 'pdv-sp-01', password: 'ana123' },
    { email: 'carla@mc.com', name: 'Carla (Gerente Sul)', role: 'MANAGER', pdvId: 'pdv-sul-01', password: 'carla123' },
    { email: 'joao@mc.com', name: 'João (Vendedor Sul)', role: 'SALES_REP', pdvId: 'pdv-sul-01', password: 'joao123' },
  ];

  console.log('Creating users...');
  for (const user of users) {
    const userId = generateId();
    const passwordHash = bcrypt.hashSync(user.password, 10);
    runQuery(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, pdv_id, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [userId, tenantId, user.email, passwordHash, user.name, user.role, user.pdvId, now, now]);
  }

  console.log('Seeding regions...');
  const regions = [
    { id: 'r1', name: 'Sudeste (SP/RJ)' },
    { id: 'r2', name: 'Sul (PR/SC/RS)' },
  ];
  for (const r of regions) {
    runQuery(`INSERT INTO regions (id, tenant_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, [r.id, tenantId, r.name, now, now]);
  }

  console.log('Seeding PDVs...');
  const pdvs = [
    { id: 'pdv-sp-01', name: 'Loja Berrini (SP)', type: 'PHYSICAL_STORE', regionId: 'r1', location: 'São Paulo, SP' },
    { id: 'pdv-sp-02', name: 'Quiosque Morumbi', type: 'KIOSK', regionId: 'r1', location: 'São Paulo, SP' },
    { id: 'pdv-sul-01', name: 'Filial Curitiba', type: 'PHYSICAL_STORE', regionId: 'r2', location: 'Curitiba, PR' },
  ];
  for (const p of pdvs) {
    runQuery(`INSERT INTO pdvs (id, tenant_id, name, type, region_id, location, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`, [p.id, tenantId, p.name, p.type, p.regionId, p.location, now, now]);
  }

  console.log('Seeding pipeline stages...');
  const stages = [
    { id: 'stage-lead', name: 'Prospecção', color: 'border-t-blue-500', type: 'OPEN' },
    { id: 'stage-contacted', name: 'Qualificação', color: 'border-t-yellow-500', type: 'OPEN' },
    { id: 'stage-proposal', name: 'Apresentação', color: 'border-t-purple-500', type: 'OPEN' },
    { id: 'stage-negotiation', name: 'Fechamento', color: 'border-t-orange-500', type: 'OPEN' },
    { id: 'stage-won', name: 'Vendido', color: 'border-t-green-500', type: 'WON' },
    { id: 'stage-lost', name: 'Perdido', color: 'border-t-red-500', type: 'LOST' },
  ];
  stages.forEach((s, i) => {
    runQuery(`INSERT INTO pipeline_stages (id, tenant_id, name, color, type, automation_steps, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)`, [s.id, tenantId, s.name, s.color, s.type, i, now, now]);
  });

  console.log('Seeding tags...');
  const tags = [
    { id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
    { id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' },
    { id: 't3', label: 'Frio', color: 'bg-blue-100 text-blue-800' },
  ];
  for (const t of tags) {
    runQuery(`INSERT INTO tags (id, tenant_id, label, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, [t.id, tenantId, t.label, t.color, now, now]);
  }

  console.log('Seeding custom fields...');
  const customFields = [
    { id: 'cf-deal-source', key: 'origin_source', label: 'Origem do Lead', type: 'select', scope: 'DEAL', options: JSON.stringify(['Google Ads', 'Indicação', 'Instagram', 'Passante']), required: 1 },
    { id: 'cf-cust-birth', key: 'birthdate', label: 'Data de Nascimento / Fundação', type: 'date', scope: 'CUSTOMER', options: '[]', required: 0 },
    { id: 'cf-cust-segment', key: 'segment', label: 'Segmento', type: 'select', scope: 'CUSTOMER', options: JSON.stringify(['Varejo', 'Atacado', 'Serviços']), required: 0 },
  ];
  for (const cf of customFields) {
    runQuery(`INSERT INTO custom_field_definitions (id, tenant_id, key, label, type, scope, options, required, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`, 
      [cf.id, tenantId, cf.key, cf.label, cf.type, cf.scope, cf.options, cf.required, now, now]);
  }

  console.log('Seeding products...');
  const products = [
    { id: 'p1', name: 'Carta Imóvel 500k', description: 'Consórcio Imobiliário Premium', category: 'Consórcio', basePrice: 500000, attributes: JSON.stringify([{ key: 'taxa', label: 'Taxa Adm', value: '14%' }]), formSchema: JSON.stringify([{ key: 'group_number', label: 'Grupo', type: 'text', required: true }, { key: 'quota_number', label: 'Cota', type: 'text', required: true }, { key: 'contract_term', label: 'Prazo (Meses)', type: 'number', required: true }]), automationSteps: JSON.stringify([{ id: 's1', name: 'Boas vindas imediata', delayValue: 5, delayUnit: 'MINUTES', messageTemplate: 'Olá, obrigado por adquirir o Consórcio Imóvel. Seu contrato está sendo gerado.' }]), defaultFollowUpDays: null },
    { id: 'p2', name: 'Consórcio Auto 80k', description: 'Veículos leves e utilitários', category: 'Consórcio', basePrice: 80000, attributes: JSON.stringify([{ key: 'taxa', label: 'Taxa Adm', value: '16%' }]), formSchema: JSON.stringify([{ key: 'group_number', label: 'Grupo', type: 'text', required: true }, { key: 'quota_number', label: 'Cota', type: 'text', required: true }]), automationSteps: '[]', defaultFollowUpDays: null },
    { id: 'p3', name: 'iPhone 15 Pro Max', description: 'Dispositivo eletrônico de varejo', category: 'Varejo', basePrice: 9000, attributes: JSON.stringify([{ key: 'brand', label: 'Marca', value: 'Apple' }]), formSchema: JSON.stringify([{ key: 'sku', label: 'SKU / Código', type: 'text', required: true }, { key: 'color', label: 'Cor', type: 'select', options: ['Titânio Natural', 'Preto', 'Branco', 'Azul'], required: true }, { key: 'imei', label: 'IMEI', type: 'text', required: false }]), automationSteps: '[]', defaultFollowUpDays: null },
  ];
  for (const p of products) {
    runQuery(`INSERT INTO products (id, tenant_id, name, description, category, base_price, attributes, form_schema, automation_steps, default_follow_up_days, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`, 
      [p.id, tenantId, p.name, p.description, p.category, p.basePrice, p.attributes, p.formSchema, p.automationSteps, p.defaultFollowUpDays, now, now]);
  }

  console.log('Seeding customers...');
  const customers = [
    { id: 'c1', type: 'PJ', name: 'Tech Solutions PJ', document: '12.345.678/0001-90', email: 'contato@tech.com', phone: '11 99999-9999', zipCode: '04551-000', status: 'ACTIVE', pdvIds: JSON.stringify(['pdv-sp-01']), assignedEmployeeIds: JSON.stringify(['rep-sp-01']), customValues: JSON.stringify({ segment: 'Serviços' }) },
    { id: 'c2', type: 'PJ', name: 'Agro Sul Ltda', document: '98.765.432/0001-10', email: 'comercial@agrosul.com', phone: '41 88888-8888', zipCode: '80240-000', status: 'PROPONENT', pdvIds: JSON.stringify(['pdv-sul-01']), assignedEmployeeIds: JSON.stringify(['rep-sul-01']), customValues: JSON.stringify({ segment: 'Atacado' }) },
    { id: 'c3', type: 'PF', name: 'Investidor João', document: '123.456.789-00', email: 'joao@gmail.com', phone: '11 98888-7777', zipCode: '01310-100', status: 'LEAD', pdvIds: JSON.stringify(['pdv-sp-01', 'pdv-sul-01']), assignedEmployeeIds: JSON.stringify(['gerente-sp']), customValues: JSON.stringify({ birthdate: '1985-05-15' }) },
  ];
  for (const c of customers) {
    runQuery(`INSERT INTO customers (id, tenant_id, type, name, document, email, phone, zip_code, status, pdv_ids, assigned_employee_ids, custom_values, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [c.id, tenantId, c.type, c.name, c.document, c.email, c.phone, c.zipCode, c.status, c.pdvIds, c.assignedEmployeeIds, c.customValues, now, now]);
  }

  console.log('Seeding deals...');
  const deals = [
    { id: 'd1', title: 'Expansão Sede Tech', pdvId: 'pdv-sp-01', customerId: 'c1', customerName: 'Tech Solutions PJ', value: 500000, stageId: 'stage-won', visibility: 'PUBLIC', assignedEmployeeIds: JSON.stringify(['rep-sp-01']), productIds: JSON.stringify(['p1']), customValues: JSON.stringify({ group_number: '1020', quota_number: '55', contract_term: 180, origin_source: 'Indicação' }), tags: JSON.stringify([{ id: 't1', label: 'VIP', color: 'bg-purple-100 text-purple-800' }]), notes: 'Cliente quer usar lance embutido.', nextFollowUpDate: null },
    { id: 'd2', title: 'Frota Agro Sul', pdvId: 'pdv-sul-01', customerId: 'c2', customerName: 'Agro Sul Ltda', value: 160000, stageId: 'stage-proposal', visibility: 'RESTRICTED', assignedEmployeeIds: JSON.stringify(['rep-sul-01']), productIds: JSON.stringify(['p2']), customValues: '{}', tags: JSON.stringify([{ id: 't2', label: 'Quente', color: 'bg-red-100 text-red-800' }]), notes: 'Cotando 2 cartas de auto.', nextFollowUpDate: null },
    { id: 'd3', title: 'Compra iPhone Corporativo', pdvId: 'pdv-sp-02', customerId: 'c3', customerName: 'Investidor João', value: 9000, stageId: 'stage-won', visibility: 'PUBLIC', assignedEmployeeIds: JSON.stringify(['gerente-sp']), productIds: JSON.stringify(['p3']), customValues: JSON.stringify({ sku: 'IPH15-TIT', color: 'Titânio Natural', origin_source: 'Passante' }), tags: '[]', notes: 'Retirada em loja.', nextFollowUpDate: null },
  ];
  for (const d of deals) {
    runQuery(`INSERT INTO deals (id, tenant_id, title, pdv_id, customer_id, customer_name, value, stage_id, visibility, assigned_employee_ids, product_ids, custom_values, tags, notes, next_follow_up_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [d.id, tenantId, d.title, d.pdvId, d.customerId, d.customerName, d.value, d.stageId, d.visibility, d.assignedEmployeeIds, d.productIds, d.customValues, d.tags, d.notes, d.nextFollowUpDate, now, now]);
  }

  console.log('Seeding integrations...');
  const integrations = [
    { id: 'whatsapp-1', name: 'WhatsApp Business', type: 'WHATSAPP', status: 'DISCONNECTED' },
  ];
  for (const i of integrations) {
    runQuery(`INSERT INTO integrations (id, tenant_id, name, type, status, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`, [i.id, tenantId, i.name, i.type, i.status, now, now]);
  }

  console.log('Seeding dashboard widgets...');
  const widgets = [
    { id: 'w0', type: 'GOAL_PROGRESS', title: 'Metas do Mês', colSpan: 4 },
    { id: 'w1', type: 'KPI_TOTAL_SALES', title: 'Volume Geral', colSpan: 1 },
    { id: 'w2', type: 'KPI_ACTIVE_DEALS', title: 'Pipeline Ativo', colSpan: 1 },
    { id: 'w3', type: 'KPI_CONVERSION', title: 'Conversão', colSpan: 1 },
    { id: 'w4', type: 'KPI_AVG_TICKET', title: 'Ticket Médio', colSpan: 1 },
    { id: 'w5', type: 'CHART_FUNNEL', title: 'Funil de Vendas', colSpan: 2 },
    { id: 'w6', type: 'CHART_SALES_BY_REP', title: 'Ranking Equipe', colSpan: 2 },
  ];
  for (const w of widgets) {
    runQuery(`INSERT INTO dashboard_widgets (id, tenant_id, user_id, type, title, col_span, config, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, '{}', ?, ?)`, [w.id, tenantId, w.type, w.title, w.colSpan, now, now]);
  }

  closeDb();
  console.log('Database seeded successfully!');
  console.log('\nDemo credentials:');
  console.log('  Organization: demo');
  console.log('  Admin: admin@mc.com / admin123');
}

main().catch(console.error);
