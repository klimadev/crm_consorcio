import { useState, useEffect, useCallback } from 'react';

interface UseTenantDataOptions<T> {
  endpoint: string;
  initialData: T[];
  onError?: (error: Error) => void;
}

interface UseTenantDataResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  add: (item: any) => Promise<T | null>;
  update: (id: string, item: any) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

function getDataFromResponse<T>(result: any, endpoint: string): T[] {
  if (!result.success) return [];
  
  const key = endpoint.includes('/') ? endpoint.split('/').pop() || endpoint : endpoint;
  
  if (result[key] && Array.isArray(result[key])) return result[key] as T[];
  if (result.deals) return result.deals as T[];
  if (result.stages) return result.stages as T[];
  if (result.tags) return result.tags as T[];
  if (result.customers) return result.customers as T[];
  if (result.products) return result.products as T[];
  if (result.pdvs) return result.pdvs as T[];
  if (result.regions) return result.regions as T[];
  if (result.fields) return result.fields as T[];
  
  return [];
}

function getItemFromResponse<T>(result: any, endpoint: string): T | null {
  if (!result.success) return null;
  
  const key = endpoint.includes('/') ? endpoint.split('/').pop() : endpoint;
  const singularKey = key?.replace(/s$/, '') || key;
  
  return result[singularKey || ''] || result.region || result.pdv || result.customer || 
         result.deal || result.product || result.stage || result.tag || result.field || null;
}

export function useTenantData<T>(options: UseTenantDataOptions<T>): UseTenantDataResult<T> {
  const { endpoint, initialData, onError } = options;
  
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/${endpoint}`);
      const result = await response.json();
      setData(getDataFromResponse<T>(result, endpoint));
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar dados');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = useCallback(async (item: any): Promise<T | null> => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      const newItem = getItemFromResponse<T>(result, endpoint);
      
      if (newItem) {
        setData(prev => [...(prev as any[]), newItem]);
        return newItem;
      }
      return null;
    } catch (err) {
      console.error('Error adding item:', err);
      return null;
    }
  }, [endpoint]);

  const update = useCallback(async (id: string, item: any): Promise<T | null> => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...item }),
      });
      const result = await response.json();
      const updatedItem = getItemFromResponse<T>(result, endpoint);
      
      if (updatedItem) {
        setData(prev => (prev as any[]).map(i => i.id === id ? updatedItem : i));
        return updatedItem;
      }
      return null;
    } catch (err) {
      console.error('Error updating item:', err);
      return null;
    }
  }, [endpoint]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/${endpoint}?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        setData(prev => (prev as any[]).filter(i => i.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing item:', err);
      return false;
    }
  }, [endpoint]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    add,
    update,
    remove,
  };
}

export function useTenantEntity<T>(endpoint: string, initialData: T[]) {
  return useTenantData<T>({ endpoint, initialData });
}
