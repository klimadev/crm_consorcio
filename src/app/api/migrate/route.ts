import { NextRequest, NextResponse } from 'next/server';
import { parseCookies, verifyToken } from '@/lib/auth/jwt';
import { getDatabase, makeId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const accessToken = cookies.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { localStorageData } = body;

    if (!localStorageData) {
      return NextResponse.json({ success: false, message: 'Dados do localStorage são obrigatórios' }, { status: 400 });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const results = {
      preferences: 0,
      widgets: 0,
      errors: [] as string[],
    };

    if (localStorageData.preferences) {
      for (const [key, value] of Object.entries(localStorageData.preferences)) {
        try {
          const prefId = makeId();
          const prefValue = typeof value === 'string' ? value : JSON.stringify(value);
          db.prepare(`
            INSERT INTO preferences (id, user_id, key, value, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET value = ?, updated_at = ?
          `).run(prefId, payload.userId, key, prefValue, now, now, prefValue, now);
          results.preferences++;
        } catch (err) {
          results.errors.push(`Erro ao migrar preferência ${key}: ${err}`);
        }
      }
    }

    if (localStorageData.dashboardWidgets) {
      const widgets = Array.isArray(localStorageData.dashboardWidgets) 
        ? localStorageData.dashboardWidgets 
        : JSON.parse(localStorageData.dashboardWidgets || '[]');
      
      for (let i = 0; i < widgets.length; i++) {
        const widget = widgets[i];
        try {
          const widgetId = makeId();
          db.prepare(`
            INSERT INTO dashboard_widgets (id, user_id, widget_type, data, position, size, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(widgetId, payload.userId, widget.type || widget.widgetType || 'unknown', JSON.stringify(widget.data || {}), widget.position ?? i, widget.size || 'normal', now, now);
          results.widgets++;
        } catch (err) {
          results.errors.push(`Erro ao migrar widget ${i}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migração concluída',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}
