/**
 * useAuth Hook
 */

'use client';

import { useContext } from 'react';
import { UserContext } from '@/context/UserContext';
import type { SessionUser } from '@/lib/schema';

export function useAuth() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}

export type { SessionUser };
