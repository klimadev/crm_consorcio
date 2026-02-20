import { auth } from '@/lib/auth/auth';
import { getUsersByTenant, updateUser, getUserById, deleteUser } from '@/lib/db/operations';
import { getDb } from '@/lib/db/connection';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { runInTransaction } from '@/lib/db/tx';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { User } from '@/types/db';
import type { Employee, Role } from '@/types';

function transformUserToEmployee(user: User): Employee {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    pdvId: user.pdv_id,
    active: Boolean(user.active),
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
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.email || !data.name || !data.password) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
    }

    const db = getDb();
    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = (data.role || 'COLLABORATOR') as Role;
    const companyId = session.user.tenantId;

    runInTransaction(db, () => {
      membershipRepository.createUser(db, {
        id: userId,
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.name,
        companyId,
        role,
      });

      membershipRepository.createMembership(db, {
        id: membershipId,
        companyId,
        userId,
        role,
      });
    });

    return NextResponse.json({
      id: userId,
      email: data.email.toLowerCase(),
      name: data.name,
      role,
      active: true,
    }, { status: 201 });
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

    if (session.user.role !== 'OWNER' && data.role) {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
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
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 401 });
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
