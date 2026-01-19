import { auth } from '@/lib/auth/auth';
import { getTagsByTenant, createTag, deleteTag } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = getTagsByTenant(session.user.tenantId);
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.label || !data.color) {
      return NextResponse.json({ error: 'Label and color are required' }, { status: 400 });
    }

    const tag = createTag(session.user.tenantId, data.label, data.color);
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM tags WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    deleteTag(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
