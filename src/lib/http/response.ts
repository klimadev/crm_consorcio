import { NextResponse } from 'next/server';
import type { ApiFailure, ApiSuccess } from '@/types';
import { toAppError } from '@/lib/http/errors';

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

export function fail(error: unknown): NextResponse<ApiFailure> {
  const appError = toAppError(error);
  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    },
    { status: appError.status },
  );
}
