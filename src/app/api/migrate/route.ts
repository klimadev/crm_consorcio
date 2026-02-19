import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { getDatabase, makeId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    const body = await request.json();
    const { localStorageData } = body;

    if (!localStorageData) {
      throw new AppError('VALIDATION_ERROR', 'Dados do localStorage são obrigatórios', 400);
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
          `).run(prefId, ctx.userId, key, prefValue, now, now, prefValue, now);
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
          `).run(widgetId, ctx.userId, widget.type || widget.widgetType || 'unknown', JSON.stringify(widget.data || {}), widget.position ?? i, widget.size || 'normal', now, now);
          results.widgets++;
        } catch (err) {
          results.errors.push(`Erro ao migrar widget ${i}: ${err}`);
        }
      }
    }

    return ok({
      message: 'Migração concluída',
      results,
    });
  } catch (error) {
    return fail(error);
  }
}
