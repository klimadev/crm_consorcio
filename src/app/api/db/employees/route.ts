import { auth } from '@/lib/auth/auth';
import { getUsersByTenant, createUser, updateUser, getUserById, deleteUser } from '@/lib/db/operations';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types/db';
import type { Employee } from '@/types';

function transformUserToEmployee(user: User): Employee {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    pdvId: user.pdv_id,
    active: Boolean(user.is_active),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUsersByTenant(session.user.tenantId);
    const employees = users.map(transformUserToEmployee);
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.email || !data.name || !data.password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
    }

    const user = createUser(
      session.user.tenantId,
      data.email,
      data.password,
      data.name,
      data.role || 'SALES_REP',
      data.pdvId || null
    );

    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
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

    const existingUser = await getUserById(data.id);
    if (!existingUser || existingUser.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (session.user.role !== 'ADMIN' && data.role) {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 });
    }

    const user = await updateUser(data.id, data);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existingUser = getUserById(id);
    if (!existingUser || existingUser.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
