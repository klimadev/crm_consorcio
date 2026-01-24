'use client';

import { useQuery } from '@tanstack/react-query';
import { Employee } from '@/types';
import { api } from '@/services/api';

export function useCurrentUser() {
  return useQuery<Employee | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; user?: Employee } | null>('/auth/me');
      if (!data || !data.success || !data.user) return null;
      return data.user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
