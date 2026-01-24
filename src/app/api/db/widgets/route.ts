import { auth } from '@/lib/auth/auth';
import { getDashboardWidgetsByTenant, createDashboardWidget, updateDashboardWidget, deleteDashboardWidget, getPreference, createOrUpdatePreference } from '@/lib/db/operations';
import { generateId, getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { DashboardWidget as DashboardWidgetDB } from '@/types/db';
import type { DashboardWidget } from '@/types';
import { DEFAULT_DASHBOARD_WIDGETS } from '@/constants';

const DASHBOARD_PREF_KEY = 'dashboard_widgets_v1';

function normalizeWidgets(input: unknown): DashboardWidget[] {
  if (!Array.isArray(input)) return [];

  const colSpanValues = new Set([1, 2, 3, 4]);

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<DashboardWidget>;
      if (!candidate.type || typeof candidate.type !== 'string') return null;

      const id = typeof candidate.id === 'string' && candidate.id.trim().length > 0 ? candidate.id : generateId();
      const title = typeof candidate.title === 'string' && candidate.title.trim().length > 0 ? candidate.title : candidate.type;
      const colSpan = colSpanValues.has(Number(candidate.colSpan)) ? (Number(candidate.colSpan) as 1 | 2 | 3 | 4) : 1;

      return { id, type: candidate.type as DashboardWidget['type'], title, colSpan };
    })
    .filter((item): item is DashboardWidget => Boolean(item));
}

function loadPreferenceWidgets(userId: string): DashboardWidget[] | null {
  const preference = getPreference(userId, DASHBOARD_PREF_KEY);
  if (!preference?.value) return null;

  try {
    const parsed = JSON.parse(preference.value);
    if (!Array.isArray(parsed)) return null;
    return normalizeWidgets(parsed);
  } catch {
    return null;
  }
}

function savePreferenceWidgets(userId: string, widgets: DashboardWidget[]): void {
  createOrUpdatePreference(userId, DASHBOARD_PREF_KEY, JSON.stringify(widgets));
}

function transformWidgetToComponent(widget: DashboardWidgetDB): DashboardWidget {
  return {
    id: widget.id,
    type: widget.type as DashboardWidget['type'],
    title: widget.title,
    colSpan: (widget.col_span || 1) as 1 | 2 | 3 | 4,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferenceWidgets = loadPreferenceWidgets(session.user.userId);
    if (preferenceWidgets !== null) {
      return NextResponse.json(preferenceWidgets);
    }

    const widgetsDB = await getDashboardWidgetsByTenant(session.user.tenantId, session.user.userId);
    const widgets = widgetsDB.map(transformWidgetToComponent);

    if (widgets.length === 0) {
      return NextResponse.json(DEFAULT_DASHBOARD_WIDGETS);
    }

    return NextResponse.json(widgets);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (data.reset) {
      savePreferenceWidgets(session.user.userId, DEFAULT_DASHBOARD_WIDGETS);
      return NextResponse.json(DEFAULT_DASHBOARD_WIDGETS);
    }

    if (data.widgets) {
      const widgets = normalizeWidgets(data.widgets);
      savePreferenceWidgets(session.user.userId, widgets);
      return NextResponse.json(widgets);
    }

    if (!data.type || !data.title) {
      return NextResponse.json({ error: 'Type and title are required' }, { status: 400 });
    }

    const widget = createDashboardWidget(session.user.tenantId, {
      type: data.type,
      title: data.title,
      col_span: data.colSpan || 1,
      config: data.config || {},
      user_id: session.user.userId,
    });

    return NextResponse.json(widget, { status: 201 });
  } catch (error) {
    console.error('Error creating widget:', error);
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

    if (data.widgets) {
      const widgets = normalizeWidgets(data.widgets);
      savePreferenceWidgets(session.user.userId, widgets);
      return NextResponse.json(widgets);
    }

    if (!data.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM dashboard_widgets WHERE id = ?', [data.id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const widget = updateDashboardWidget(data.id, data);
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json(widget);
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getOneQuery<any>('SELECT tenant_id FROM dashboard_widgets WHERE id = ?', [id]);
    if (!existing || existing.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    deleteDashboardWidget(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
