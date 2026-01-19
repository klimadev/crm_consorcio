import { auth } from '@/lib/auth/auth';
import { getPDVsByTenant, createPDV, updatePDV, deletePDV } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { PDV as PDVDB } from '@/types/db';
import type { PDV } from '@/types';

function transformPDVToComponent(pdv: PDVDB): PDV {
  return {
    id: pdv.id,
    name: pdv.name,
    type: pdv.type,
    regionId: pdv.region_id,
    location: pdv.location,
    isActive: Boolean(pdv.is_active),
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pdvsDB = await getPDVsByTenant(session.user.tenantId);
    const pdvs = pdvsDB.map(transformPDVToComponent);
    return NextResponse.json(pdvs);
  } catch (error) {
    console.error('Error fetching PDVs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.name || !data.type || !data.regionId) {
      return NextResponse.json({ error: 'Name, type, and regionId are required' }, { status: 400 });
    }

    const pdv = createPDV(session.user.tenantId, data.name, data.type, data.regionId, data.location || '');
    return NextResponse.json(pdv, { status: 201 });
  } catch (error) {
    console.error('Error creating PDV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM pdvs WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'PDV not found' }, { status: 404 });
    }

    const pdv = updatePDV(data.id, data);
    if (!pdv) {
      return NextResponse.json({ error: 'PDV not found' }, { status: 404 });
    }

    return NextResponse.json(pdv);
  } catch (error) {
    console.error('Error updating PDV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM pdvs WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'PDV not found' }, { status: 404 });
    }

    deletePDV(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
