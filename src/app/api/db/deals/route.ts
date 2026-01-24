import { auth } from '@/lib/auth/auth';
import { getDealsByTenant, createDeal, updateDeal, deleteDeal } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Deal as DealDB } from '@/types/db';
import type { Deal } from '@/types';

function transformDealToComponent(deal: DealDB): Deal {
  return {
    id: deal.id,
    title: deal.title,
    pdvId: deal.pdv_id || null,
    customerId: deal.customer_id || '',
    customerName: deal.customer_name,
    value: deal.value || 0,
    stageId: deal.stage_id,
    visibility: deal.visibility,
    assignedEmployeeIds: typeof deal.assigned_employee_ids === 'string' ? JSON.parse(deal.assigned_employee_ids || '[]') : (deal.assigned_employee_ids || []),
    productIds: typeof deal.product_ids === 'string' ? JSON.parse(deal.product_ids || '[]') : (deal.product_ids || []),
    customValues: typeof deal.custom_values === 'string' ? JSON.parse(deal.custom_values || '{}') : (deal.custom_values || {}),
    tags: typeof deal.tags === 'string' ? JSON.parse(deal.tags || '[]') : (deal.tags || []),
    notes: deal.notes || '',
    nextFollowUpDate: deal.next_follow_up_date || undefined,
    createdAt: deal.created_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealsDB = await getDealsByTenant(session.user.tenantId);
    const deals = dealsDB.map(transformDealToComponent);
    return NextResponse.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.title || !data.customerId || !data.customerName || !data.stageId) {
      return NextResponse.json({ error: 'Title, customerId, customerName, and stageId are required' }, { status: 400 });
    }

    const deal = createDeal(
      session.user.tenantId,
      data.title,
      data.value || 0,
      data.stageId,
      data.customerId,
      data.pdvId || null,
      null, // productId
      JSON.stringify(data.productIds || []),
      JSON.stringify(data.tags || []),
      data.notes || ''
    );

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM deals WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = updateDeal(
      data.id,
      data.title,
      data.value || 0,
      data.stage_id || data.stageId,
      data.customer_id || data.customerId,
      data.pdv_id || data.pdvId,
      data.product_id || null,
      JSON.stringify(data.product_ids || data.productIds || []),
      JSON.stringify(data.tags || []),
      data.notes || ''
    );
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM deals WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    deleteDeal(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
