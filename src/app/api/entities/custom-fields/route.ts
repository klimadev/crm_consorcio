import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  getCustomFieldDefinitionsByTenant, createCustomFieldDefinition,
  updateCustomFieldDefinition, deleteCustomFieldDefinition, getCustomFieldDefinitionById
} from '@/lib/db/operations';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // For single field, we need to implement or skip for now
      return NextResponse.json({ success: false, message: 'Not implemented' }, { status: 501 });
    }

    const fields = getCustomFieldDefinitionsByTenant(user.tenantId);
    return NextResponse.json({ success: true, fields });
  } catch (error) {
    console.error('Get custom fields error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { entityType, fieldKey, fieldLabel, fieldType, options, required } = body;

    if (!entityType || !fieldKey || !fieldLabel || !fieldType) {
      return NextResponse.json({ success: false, message: 'entityType, fieldKey, fieldLabel e fieldType são obrigatórios' }, { status: 400 });
    }

    const field = createCustomFieldDefinition(user.tenantId, {
      key: fieldKey,
      label: fieldLabel,
      type: fieldType,
      scope: entityType,
      options: options || [],
      required: required || false,
      active: true
    });
    return NextResponse.json({ success: true, field });
  } catch (error) {
    console.error('Create custom field error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, entityType, fieldKey, fieldLabel, fieldType, options, required } = body;

    if (!id || !entityType || !fieldKey || !fieldLabel || !fieldType) {
      return NextResponse.json({ success: false, message: 'ID e todos os campos são obrigatórios' }, { status: 400 });
    }

    const existing = getCustomFieldDefinitionById(id);
    if (!existing || existing.tenant_id !== user.tenantId) {
      return NextResponse.json({ success: false, message: 'Campo não encontrado' }, { status: 404 });
    }

    const field = updateCustomFieldDefinition(id, {
      key: fieldKey,
      label: fieldLabel,
      type: fieldType,
      scope: entityType,
      options: options || [],
      required: required || false
    });
    return NextResponse.json({ success: true, field });
  } catch (error) {
    console.error('Update custom field error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório' }, { status: 400 });
    }

    const existing = getCustomFieldDefinitionById(id);
    if (!existing || existing.tenant_id !== user.tenantId) {
      return NextResponse.json({ success: false, message: 'Campo não encontrado' }, { status: 404 });
    }

    deleteCustomFieldDefinition(id);
    return NextResponse.json({ success: true, message: 'Campo deletado' });
  } catch (error) {
    console.error('Delete custom field error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
