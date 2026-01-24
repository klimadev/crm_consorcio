'use client';

export const generateStableId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const getCurrentDateISO = (): string => {
  if (typeof window === 'undefined') {
    return new Date().toISOString();
  }
  return new Date().toISOString();
};