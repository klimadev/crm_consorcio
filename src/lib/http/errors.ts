import type { ApiError } from '@/types';

type ErrorCode = ApiError['code'];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, status: number, details: unknown = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError('INTERNAL_ERROR', 'Unexpected server error.', 500);
}
