/**
 * User Context
 */

'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getClientUser, logout as logoutUser, clearStaleDevCookies } from '@/lib/auth';
import type { SessionUser } from '@/lib/schema';

export interface UserContextValue {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cookieUser = getClientUser();
      if (cookieUser) {
        setUser(cookieUser);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[UserContext] Error:', err);
      setError('Failed to load user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));

    if (isProduction) clearStaleDevCookies();
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await logoutUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}
