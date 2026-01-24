import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  createRegion, createPDV, createProduct, createPipelineStage, createTag,
  createCustomer, createDeal, getRegionsByTenant, countEntitiesByTenant,
  createCustomFieldDefinition
} from '@/lib/db/operations';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Apenas administradores e gerentes podem fazer seed' }, { status: 403 });
    }

    const counts = countEntitiesByTenant(user.tenantId);
    const hasData = counts.regions > 0 || counts.pdvs > 0 || counts.stages > 0;

    if (hasData) {
      return NextResponse.json({
        success: false,
        message: 'Tenant já possui dados. Use force=true para sobrescrever.',
        currentCounts: counts
      }, { status: 400 });
    }

    const body = await request.json();
    const force = body.force === true;

    if (hasData && !force) {
      return NextResponse.json({
        success: false,
        message: 'Tenant já possui dados. Confirme com force=true.',
        currentCounts: counts
      }, { status: 400 });
    }

    const results = {
      regions: [] as string[],
      pdvs: [] as string[],
      products: [] as string[],
      stages: [] as string[],
      tags: [] as string[],
      customers: [] as string[],
      deals: [] as string[],
      customFields: [] as string[]
    };

    const now = new Date().toISOString();

    const r1 = createRegion(user.tenantId, 'Sudeste (SP/RJ)');
    const r2 = createRegion(user.tenantId, 'Sul (PR/SC/RS)');
    results.regions.push(r1.id, r2.id);

    const p1 = createPDV(user.tenantId, 'Loja Berrini (SP)', 'PHYSICAL_STORE', r1.id, 'Av. Berrini, 1000, São Paulo, SP');
    const p2 = createPDV(user.tenantId, 'Quiosque Morumbi', 'KIOSK', r1.id, 'Shopping Morumbi, São Paulo, SP');
    const p3 = createPDV(user.tenantId, 'Filial Curitiba', 'PHYSICAL_STORE', r2.id, 'Av. Batel, 500, Curitiba, PR');
    results.pdvs.push(p1.id, p2.id, p3.id);

    const prod1 = createProduct(user.tenantId, { name: 'Carta Imóvel 500k', description: 'CONS-IMOVEL-500', category: 'Imóveis', base_price: 500000, attributes: JSON.stringify([{ key: 'taxa', label: 'Taxa Adm', value: '14%' }]), form_schema: '[]', automation_steps: '[]', default_follow_up_days: null, active: true });
    const prod2 = createProduct(user.tenantId, { name: 'Consórcio Auto 80k', description: 'CONS-AUTO-80', category: 'Auto', base_price: 80000, attributes: JSON.stringify([{ key: 'taxa', label: 'Taxa Adm', value: '16%' }]), form_schema: '[]', automation_steps: '[]', default_follow_up_days: null, active: true });
    const prod3 = createProduct(user.tenantId, { name: 'iPhone 15 Pro Max', description: 'IPH15-PRO-MAX', category: 'Eletrônicos', base_price: 9000, attributes: JSON.stringify([{ key: 'brand', label: 'Marca', value: 'Apple' }]), form_schema: '[]', automation_steps: '[]', default_follow_up_days: null, active: true });
    results.products.push(prod1.id, prod2.id, prod3.id);

    const s1 = createPipelineStage(user.tenantId, { name: 'Prospecção', color: '', type: 'OPEN', automation_steps: '[]' });
    const s2 = createPipelineStage(user.tenantId, { name: 'Qualificação', color: '', type: 'OPEN', automation_steps: '[]' });
    const s3 = createPipelineStage(user.tenantId, { name: 'Apresentação', color: '', type: 'OPEN', automation_steps: '[]' });
    const s4 = createPipelineStage(user.tenantId, { name: 'Fechamento', color: '', type: 'OPEN', automation_steps: '[]' });
    const s5 = createPipelineStage(user.tenantId, { name: 'Vendido', color: '', type: 'WON', automation_steps: '[]' });
    const s6 = createPipelineStage(user.tenantId, { name: 'Perdido', color: '', type: 'LOST', automation_steps: '[]' });
    results.stages.push(s1.id, s2.id, s3.id, s4.id, s5.id, s6.id);

    const t1 = createTag(user.tenantId, 'VIP', 'bg-purple-100 text-purple-800');
    const t2 = createTag(user.tenantId, 'Quente', 'bg-red-100 text-red-800');
    const t3 = createTag(user.tenantId, 'Frio', 'bg-blue-100 text-blue-800');
    results.tags.push(t1.id, t2.id, t3.id);

    const c1 = createCustomer(user.tenantId, 'Tech Solutions PJ', 'PJ', '12.345.678/0001-90', 'contato@tech.com', '11 99999-9999', 'ACTIVE', r1.id, p1.id);
    const c2 = createCustomer(user.tenantId, 'Agro Sul Ltda', 'PJ', '98.765.432/0001-10', 'comercial@agrosul.com', '41 88888-8888', 'PROPONENT', r2.id, p3.id);
    const c3 = createCustomer(user.tenantId, 'Investidor João', 'PF', '123.456.789-00', 'joao@gmail.com', '11 98888-7777', 'LEAD', r1.id, p1.id);
    results.customers.push(c1.id, c2.id, c3.id);

    const d1 = createDeal(user.tenantId, 'Expansão Sede Tech', 500000, s5.id, c1.id, p1.id, prod1.id, JSON.stringify([prod1.id]), JSON.stringify([t1]), 'Cliente quer usar lance embutido.');
    const d2 = createDeal(user.tenantId, 'Frota Agro Sul', 160000, s3.id, c2.id, p3.id, prod2.id, JSON.stringify([prod2.id]), JSON.stringify([t2]), 'Cotando 2 cartas de auto.');
    const d3 = createDeal(user.tenantId, 'Compra iPhone Corporativo', 9000, s5.id, c3.id, p2.id, prod3.id, JSON.stringify([prod3.id]), JSON.stringify([]), 'Retirada em loja.');
    results.deals.push(d1.id, d2.id, d3.id);

    const cf1 = createCustomFieldDefinition(user.tenantId, { scope: 'DEAL', key: 'origin_source', label: 'Origem do Lead', type: 'select', options: ['Google Ads', 'Indicação', 'Instagram', 'Passante'], required: true, active: true });
    const cf2 = createCustomFieldDefinition(user.tenantId, { scope: 'CUSTOMER', key: 'birthdate', label: 'Data de Nascimento / Fundação', type: 'date', options: [], required: false, active: true });
    const cf3 = createCustomFieldDefinition(user.tenantId, { scope: 'CUSTOMER', key: 'segment', label: 'Segmento', type: 'select', options: ['Varejo', 'Atacado', 'Serviços'], required: false, active: true });
    results.customFields.push(cf1.id, cf2.id, cf3.id);

    return NextResponse.json({
      success: true,
      message: 'Seed concluído com sucesso',
      results
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const counts = countEntitiesByTenant(user.tenantId);
    const hasData = counts.regions > 0 || counts.pdvs > 0 || counts.stages > 0;

    return NextResponse.json({
      success: true,
      hasData,
      counts
    });
  } catch (error) {
    console.error('Check seed status error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
