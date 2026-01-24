import { auth } from '@/lib/auth/auth';
import { getDashboardWidgetsByTenant, createDashboardWidget, updateDashboardWidget, deleteDashboardWidget } from '@/lib/db/operations';
import { getOneQuery } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { DashboardWidget as DashboardWidgetDB } from '@/types/db';
import type { DashboardWidget } from '@/types';

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

    const widgetsDB = await getDashboardWidgetsByTenant(session.user.tenantId, session.user.userId);
    const widgets = widgetsDB.map(transformWidgetToComponent);
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
      const existing = getDashboardWidgetsByTenant(session.user.tenantId);
      if (existing.length === 0) {
        const defaultWidgets = [
          { type: 'GOAL_PROGRESS', title: 'Metas do Mês', colSpan: 4 },
          { type: 'KPI_TOTAL_SALES', title: 'Volume Geral', colSpan: 1 },
          { type: 'KPI_ACTIVE_DEALS', title: 'Pipeline Ativo', colSpan: 1 },
          { type: 'KPI_CONVERSION', title: 'Conversão', colSpan: 1 },
          { type: 'KPI_AVG_TICKET', title: 'Ticket Médio', colSpan: 1 },
          { type: 'CHART_FUNNEL', title: 'Funil de Vendas', colSpan: 2 },
          { type: 'CHART_SALES_BY_REP', title: 'Ranking Equipe', colSpan: 2 },
        ];

        const widgets = defaultWidgets.map(w => 
          createDashboardWidget(session.user.tenantId, {
            type: w.type as any,
            title: w.title,
            col_span: w.colSpan,
            config: '{}',
            user_id: null,
          })
        );

        return NextResponse.json(widgets);
      }
      return NextResponse.json(existing);
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
