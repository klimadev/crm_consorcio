import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { membershipRepository } from '@/lib/db/repositories/membership.repository';
import { getDb } from '@/lib/db/connection';
import { getCommercialDashboardSnapshot, type CommercialDashboardFilters } from '@/lib/db/operations';

function parseIntegerParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: CommercialDashboardFilters = {
      year: parseIntegerParam(searchParams.get('year')),
      month: parseIntegerParam(searchParams.get('month')),
      period: (searchParams.get('period') as CommercialDashboardFilters['period']) ?? undefined,
      regionId: searchParams.get('regionId') || undefined,
      pdvId: searchParams.get('pdvId') || undefined,
      managerId: searchParams.get('managerId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
    };

    // Fetch manager scopes if user is a MANAGER
    let pdvId: string | null = null;
    let membershipId: string | undefined;
    
    if (session.user.role === 'MANAGER') {
      const db = getDb();
      // For now, use userId as membershipId since JWT payload doesn't have membershipId
      // In a full implementation, we'd need to look up the membership from the database
      membershipId = session.user.userId;
      const scopes = membershipRepository.listManagerScopes(db, session.user.tenantId, membershipId);
      const pdvScope = scopes.find(s => s.scopeType === 'PDV');
      pdvId = pdvScope?.pdvId || null;
    }

    const rbacContext = {
      userId: session.user.userId,
      role: session.user.role,
      membershipId: membershipId || session.user.userId,
      pdvId,
    };

    const metrics = getCommercialDashboardSnapshot(session.user.tenantId, filters, rbacContext);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching commercial dashboard metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
