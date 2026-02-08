import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
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

    const metrics = getCommercialDashboardSnapshot(session.user.tenantId, filters);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching commercial dashboard metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
