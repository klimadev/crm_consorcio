import { auth } from '@/lib/auth/auth';
import { getDealsByTenant, createDeal, updateDeal, deleteDeal } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Deal as DealDB } from '@/types/db';
import type { Deal } from '@/types';

const debugPrefix = '[api/db/deals]';

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
    customValues: typeof deal.custom_values === 'string' ? JSON.parse(deal.custom_values || '{}') : (deal.custom_values || {}),
    notes: deal.notes || '',
    createdAt: deal.created_at,
  };
}

export async function GET(request: NextRequest) {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n${debugPrefix}:${debugId}] ========== GET /api/db/deals DEBUG START ==========`);
  
  try {
    console.log(`${debugPrefix}:${debugId}] Calling auth()...`);
    const session = await auth(request);
    
    console.log(`${debugPrefix}:${debugId}] Auth result: ${session ? 'FOUND' : 'NULL'}`);
    if (session) {
      console.log(`${debugPrefix}:${debugId}] Session user:`, JSON.stringify(session.user, null, 2));
    }
    
    if (!session?.user) {
      console.log(`${debugPrefix}:${debugId}] No session, returning 401`);
      console.log(`${debugPrefix}:${debugId}] ========== GET /api/db/deals DEBUG END (401) ==========\n`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`${debugPrefix}:${debugId}] Fetching deals for tenant: ${session.user.tenantId}`);
    const dealsDB = await getDealsByTenant(session.user.tenantId);
    const deals = dealsDB.map(transformDealToComponent);
    
    console.log(`${debugPrefix}:${debugId}] Returning ${deals.length} deals`);
    console.log(`${debugPrefix}:${debugId}] ========== GET /api/db/deals DEBUG END (SUCCESS) ==========\n`);
    return NextResponse.json(deals);
  } catch (error) {
    console.error(`${debugPrefix}:${debugId}] Error:`, error);
    console.log(`${debugPrefix}:${debugId}] ========== GET /api/db/deals DEBUG END (ERROR) ==========\n`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n${debugPrefix}:${debugId}] ========== POST /api/db/deals DEBUG START ==========`);
  
  try {
    console.log(`${debugPrefix}:${debugId}] Calling auth()...`);
    const session = await auth(request);
    
    console.log(`${debugPrefix}:${debugId}] Auth result: ${session ? 'FOUND' : 'NULL'}`);
    
    if (!session?.user) {
      console.log(`${debugPrefix}:${debugId}] No session, returning 401`);
      console.log(`${debugPrefix}:${debugId}] ========== POST /api/db/deals DEBUG END (401) ==========\n`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.title || !data.customerId || !data.customerName || !data.stageId) {
      console.log(`${debugPrefix}:${debugId}] Missing required fields`);
      console.log(`${debugPrefix}:${debugId}] ========== POST /api/db/deals DEBUG END (400) ==========\n`);
      return NextResponse.json({ error: 'Title, customerId, customerName, and stageId are required' }, { status: 400 });
    }

    const deal = createDeal(
      session.user.tenantId,
      data.title,
      data.value || 0,
      data.stageId,
      data.customerId,
      data.pdvId || null,
      null,
      '[]',
      JSON.stringify([]),
      data.notes || ''
    );

    console.log(`${debugPrefix}:${debugId}] Deal created successfully`);
    console.log(`${debugPrefix}:${debugId}] ========== POST /api/db/deals DEBUG END (SUCCESS) ==========\n`);
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error(`${debugPrefix}:${debugId}] Error:`, error);
    console.log(`${debugPrefix}:${debugId}] ========== POST /api/db/deals DEBUG END (ERROR) ==========\n`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG START ==========`);
  
  try {
    console.log(`${debugPrefix}:${debugId}] Calling auth()...`);
    const session = await auth(request);
    
    if (!session?.user) {
      console.log(`${debugPrefix}:${debugId}] No session, returning 401`);
      console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (401) ==========\n`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      console.log(`${debugPrefix}:${debugId}] Missing ID`);
      console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (400) ==========\n`);
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM deals WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      console.log(`${debugPrefix}:${debugId}] Deal not found or tenant mismatch`);
      console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (404) ==========\n`);
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = updateDeal(
      data.id,
      data.title,
      data.value || 0,
      data.stage_id || data.stageId,
      data.customer_id || data.customerId,
      data.pdv_id || data.pdvId,
      null,
      '[]',
      JSON.stringify([]),
      data.notes || ''
    );
    if (!deal) {
      console.log(`${debugPrefix}:${debugId}] Deal update failed`);
      console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (404) ==========\n`);
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    console.log(`${debugPrefix}:${debugId}] Deal updated successfully`);
    console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (SUCCESS) ==========\n`);
    return NextResponse.json(deal);
  } catch (error) {
    console.error(`${debugPrefix}:${debugId}] Error:`, error);
    console.log(`${debugPrefix}:${debugId}] ========== PUT /api/db/deals DEBUG END (ERROR) ==========\n`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const debugId = Math.random().toString(36).substring(7);
  console.log(`\n${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG START ==========`);
  
  try {
    console.log(`${debugPrefix}:${debugId}] Calling auth()...`);
    const session = await auth(request);
    
    if (!session?.user) {
      console.log(`${debugPrefix}:${debugId}] No session, returning 401`);
      console.log(`${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG END (401) ==========\n`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      console.log(`${debugPrefix}:${debugId}] Missing ID`);
      console.log(`${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG END (400) ==========\n`);
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM deals WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      console.log(`${debugPrefix}:${debugId}] Deal not found or tenant mismatch`);
      console.log(`${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG END (404) ==========\n`);
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    deleteDeal(id);
    console.log(`${debugPrefix}:${debugId}] Deal deleted successfully`);
    console.log(`${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG END (SUCCESS) ==========\n`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`${debugPrefix}:${debugId}] Error:`, error);
    console.log(`${debugPrefix}:${debugId}] ========== DELETE /api/db/deals DEBUG END (ERROR) ==========\n`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
