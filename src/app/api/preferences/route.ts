import { NextRequest } from 'next/server';
import { requireCompanySession } from '@/lib/auth/session';
import { fail, ok } from '@/lib/http/response';
import { AppError } from '@/lib/http/errors';
import { getPreferencesByUserId, upsertPreference, deletePreference } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    const preferences = getPreferencesByUserId(ctx.userId);

    const prefsMap: Record<string, string> = {};
    for (const pref of preferences) {
      prefsMap[pref.key] = pref.value;
    }

    return ok({ preferences: prefsMap });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      throw new AppError('VALIDATION_ERROR', 'Key e value são obrigatórios', 400);
    }

    upsertPreference(ctx.userId, key, JSON.stringify(value));

    return ok({ message: 'Preferência salva' });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireCompanySession();

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      throw new AppError('VALIDATION_ERROR', 'Key é obrigatória', 400);
    }

    deletePreference(ctx.userId, key);

    return ok({ message: 'Preferência deletada' });
  } catch (error) {
    return fail(error);
  }
}
