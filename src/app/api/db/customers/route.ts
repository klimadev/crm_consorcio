import { auth } from '@/lib/auth/auth';
import { getCustomersByTenant, createCustomer, updateCustomer, deleteCustomer } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Customer as CustomerDB } from '@/types/db';
import type { Customer } from '@/types';

function transformCustomerToComponent(customer: CustomerDB): Customer {
  return {
    id: customer.id,
    type: customer.type,
    name: customer.name,
    document: customer.document || '',
    email: customer.email || '',
    phone: customer.phone || '',
    zipCode: customer.zip_code || '',
    status: customer.status,
    pdvIds: typeof customer.pdv_ids === 'string' ? JSON.parse(customer.pdv_ids || '[]') : (customer.pdv_ids || []),
    assignedEmployeeIds: typeof customer.assigned_employee_ids === 'string' ? JSON.parse(customer.assigned_employee_ids || '[]') : (customer.assigned_employee_ids || []),
    customValues: typeof customer.custom_values === 'string' ? JSON.parse(customer.custom_values || '{}') : (customer.custom_values || {}),
    createdAt: customer.created_at,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customersDB = await getCustomersByTenant(session.user.tenantId);
    const customers = customersDB.map(transformCustomerToComponent);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
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
    if (!data.name || !data.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const customer = createCustomer(session.user.tenantId, {
      type: data.type,
      name: data.name,
      document: data.document || '',
      email: data.email || '',
      phone: data.phone || '',
      zip_code: data.zipCode || data.zip_code || '',
      status: data.status || 'LEAD',
      pdv_ids: data.pdvIds || [],
      assigned_employee_ids: data.assignedEmployeeIds || [],
      custom_values: data.customValues || {},
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
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

    const existing = getOneQuery<any>('SELECT tenant_id FROM customers WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = updateCustomer(data.id, data);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
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

    const existing = getOneQuery<any>('SELECT tenant_id FROM customers WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    deleteCustomer(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
