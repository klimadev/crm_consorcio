'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSyncedStateOptions<T> {
  initialData: T[];
  endpoint: string;
  parseItem?: (item: any) => T;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

interface UseSyncedStateResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  add: (item: T) => void;
  update: (item: T) => void;
  remove: (id: string) => void;
  refresh: () => Promise<void>;
  setData: (data: T[]) => void;
}

export function useSyncedState<T extends { id: string }>({
  initialData,
  endpoint,
  parseItem,
  onError,
  debounceMs = 300,
}: UseSyncedStateOptions<T>): UseSyncedStateResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pendingOperations = useRef<Map<string, T>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const parseResponseItem = useCallback((item: any): T => {
    if (parseItem) {
      return parseItem(item);
    }
    return item as T;
  }, [parseItem]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Erro ao carregar dados');
      }

      const items = Array.isArray(result)
        ? result
        : Array.isArray(result?.deals)
          ? result.deals
          : result && typeof result === 'object'
            ? [result]
            : [];

      setData(items.map(parseResponseItem));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, parseResponseItem, onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const executePendingOperations = useCallback(() => {
    if (pendingOperations.current.size === 0) return;

    const operations = Array.from(pendingOperations.current.entries());
    pendingOperations.current.clear();

    operations.forEach(async ([, item]) => {
      try {
        const existingItem = data.find(d => d.id === item.id);
        const isNew = !existingItem;

        const response = await fetch(endpoint, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || result?.message || 'Erro ao sincronizar');
        }

        const updated = result?.deal ?? result;
        if (updated && typeof updated === 'object' && 'id' in updated) {
          setData(prev => {
            const parsed = parseResponseItem(updated);
            if (isNew) {
              return prev.map(d => d.id === parsed.id ? parsed : d);
            }
            return prev.map(d => d.id === parsed.id ? parsed : d);
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro desconhecido');
        console.error('Sync error:', error);
        onError?.(error);
        refresh();
      }
    });
  }, [data, endpoint, parseResponseItem, onError, refresh]);

  const scheduleSync = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(executePendingOperations, debounceMs);
  }, [executePendingOperations, debounceMs]);

  const add = useCallback((item: T) => {
    setData(prev => {
      const newData = [...prev, item];
      pendingOperations.current.set(item.id, item);
      scheduleSync();
      return newData;
    });
  }, [scheduleSync]);

  const update = useCallback((item: T) => {
    setData(prev => {
      const newData = prev.map(d => d.id === item.id ? item : d);
      pendingOperations.current.set(item.id, item);
      scheduleSync();
      return newData;
    });
  }, [scheduleSync]);

  const remove = useCallback(async (id: string) => {
    const previousData = [...data];
    
    setData(prev => prev.filter(d => d.id !== id));
    
    try {
      const response = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (!result.success) {
        setData(previousData);
        throw new Error(result.message || 'Erro ao deletar');
      }
    } catch (err) {
      setData(previousData);
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      onError?.(error);
    }
  }, [data, endpoint, onError]);

  return {
    data,
    isLoading,
    error,
    add,
    update,
    remove,
    refresh,
    setData,
  };
}

export function useDealSync(initialData: any[]) {
  return useSyncedState({
    initialData,
    endpoint: '/api/db/deals',
    parseItem: (item: any) => ({
      id: item.id,
      title: item.title,
      pdvId: item.pdv_id,
      customerId: item.customer_id,
      customerName: item.customer_name || '',
      value: item.value,
      stageId: item.stage_id,
      visibility: item.visibility || 'PUBLIC',
      assignedEmployeeIds: item.assigned_employee_ids || [],
      notes: item.notes || '',
      createdAt: item.created_at,
    }),
  });
}
