'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionUser } from '@/types/auth';

export function useCurrentUser() {
  // Log no início da renderização
  if (typeof window !== 'undefined') {
    console.log('[useCurrentUser] Hook called');
    console.log('[useCurrentUser] Cookies:', document.cookie);
  }
  
  return useQuery<SessionUser | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      console.log('[useCurrentUser] queryFn started');
      
      try {
        const response = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include', // Importante: incluir cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[useCurrentUser] Response status:', response.status);
        console.log('[useCurrentUser] Response OK:', response.ok);
        
        if (!response.ok) {
          console.log('[useCurrentUser] Response not OK, returning null');
          return null;
        }
        
        const data = await response.json();
        console.log('[useCurrentUser] Response data:', JSON.stringify(data, null, 2));

        const payload = data?.data ?? data;

        if (!payload || !payload.success || !payload.user) {
          console.log('[useCurrentUser] Invalid response structure, returning null');
          return null;
        }

        console.log('[useCurrentUser] User found:', JSON.stringify(payload.user, null, 2));
        return payload.user;
      } catch (error) {
        console.error('[useCurrentUser] Error:', error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
