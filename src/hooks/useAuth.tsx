'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (tenantSlug: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      // Client-side - we can check for initial state here if needed
      return null;
    }
    // Server-side - return initial state
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // On client, start as false to avoid hydration mismatch
      return false;
    }
    // On server, return initial state
    return false;
  });

  useEffect(() => {
    let isComponentMounted = true;

    const checkAuthStatus = async () => {
      try {
        setLoading(true); // Start loading again on client
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (isComponentMounted) { // Verifica se o componente ainda está montado
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUser(data.user);
              setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        if (isComponentMounted) {
          console.error('Erro ao verificar autenticação:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isComponentMounted) {
          setLoading(false);
        }
      }
    };

    const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/init');
    if (isPublicRoute) {
      if (isComponentMounted) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    } else {
      // Run auth check only on client after initial render
      checkAuthStatus();
    }

    // Cleanup function
    return () => {
      isComponentMounted = false;
    };
  }, [pathname]);

  const login = async (tenantSlug: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantSlug, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
