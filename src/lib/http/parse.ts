import { AppError } from '@/lib/http/errors';

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON payload.', 400);
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', `${field} is required.`, 400);
  }

  return value.trim();
}
