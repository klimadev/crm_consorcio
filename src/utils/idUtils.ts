'use client';

let idCounter = 0;

export const generateStableId = (prefix: string): string => {
  if (typeof window === 'undefined') {
    return `${prefix}-server-${idCounter++}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

export const getCurrentDateISO = (): string => {
  if (typeof window === 'undefined') {
    return new Date().toISOString();
  }
  return new Date().toISOString();
};