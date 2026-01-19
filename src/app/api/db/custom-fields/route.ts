import { auth } from '@/lib/auth/auth';
import { getCustomFieldDefinitionsByTenant, createCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fields = getCustomFieldDefinitionsByTenant(session.user.tenantId);
    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
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
    if (!data.key || !data.label || !data.type || !data.scope) {
      return NextResponse.json({ error: 'Key, label, type, and scope are required' }, { status: 400 });
    }

    const field = createCustomFieldDefinition(session.user.tenantId, {
      key: data.key,
      label: data.label,
      type: data.type,
      scope: data.scope,
      options: data.options || [],
      required: data.required || false,
      active: data.active !== false,
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const field = updateCustomFieldDefinition(data.id, data);
    if (!field) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error('Error updating custom field:', error);
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

    deleteCustomFieldDefinition(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
