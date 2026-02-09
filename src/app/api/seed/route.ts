import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  createPDV, createProduct, createPipelineStage, createTag,
  createCustomer, createDeal, countEntitiesByTenant,
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
    const hasData = counts.pdvs > 0 || counts.stages > 0;

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
      pdvs: [] as string[],
      products: [] as string[],
      stages: [] as string[],
      tags: [] as string[],
      customers: [] as string[],
      deals: [] as string[],
      customFields: [] as string[]
    };

    const p1 = createPDV(user.tenantId, 'Loja Principal', 'PHYSICAL_STORE', 'São Paulo, SP');
    const p2 = createPDV(user.tenantId, 'E-commerce', 'ONLINE', 'Remoto');
    results.pdvs.push(p1.id, p2.id);

    const prod1 = createProduct(user.tenantId, { name: 'Carta Imóvel 500k', description: 'CONS-IMOVEL-500', category: 'Imóveis', base_price: 500000, attributes: '[]', form_schema: '[]', automation_steps: '[]', default_follow_up_days: null, active: true });
    const prod2 = createProduct(user.tenantId, { name: 'Consórcio Auto 80k', description: 'CONS-AUTO-80', category: 'Auto', base_price: 80000, attributes: '[]', form_schema: '[]', automation_steps: '[]', default_follow_up_days: null, active: true });
    results.products.push(prod1.id, prod2.id);

    const s1 = createPipelineStage(user.tenantId, { name: 'Prospecção', color: '', type: 'OPEN', automation_steps: '[]' });
    const s2 = createPipelineStage(user.tenantId, { name: 'Qualificação', color: '', type: 'OPEN', automation_steps: '[]' });
    const s3 = createPipelineStage(user.tenantId, { name: 'Fechamento', color: '', type: 'OPEN', automation_steps: '[]' });
    const s4 = createPipelineStage(user.tenantId, { name: 'Vendido', color: '', type: 'WON', automation_steps: '[]' });
    const s5 = createPipelineStage(user.tenantId, { name: 'Perdido', color: '', type: 'LOST', automation_steps: '[]' });
    results.stages.push(s1.id, s2.id, s3.id, s4.id, s5.id);

    const t1 = createTag(user.tenantId, 'VIP', 'bg-purple-100 text-purple-800');
    results.tags.push(t1.id);

    const c1 = createCustomer(user.tenantId, 'Cliente PJ', 'PJ', '12.345.678/0001-90', 'contato@cliente.com', '11 99999-9999', 'ACTIVE', p1.id);
    results.customers.push(c1.id);

    const cf1 = createCustomFieldDefinition(user.tenantId, { scope: 'DEAL', key: 'origin_source', label: 'Origem do Lead', type: 'select', options: ['Google Ads', 'Indicação', 'Instagram'], required: true, active: true });
    results.customFields.push(cf1.id);

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
    const hasData = counts.pdvs > 0 || counts.stages > 0;

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
