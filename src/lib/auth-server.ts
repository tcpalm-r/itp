/**
 * Server-Side Authentication Helpers
 *
 * These functions use next/headers and can only be used in:
 * - Server Components
 * - API Routes (Route Handlers)
 * - Server Actions
 */

import { cookies } from 'next/headers';
import { getSupabaseAdmin } from './supabase-admin';
import { AUTH_DISABLED, MOCK_USER, USER_COOKIE } from './auth';

export interface ITPUser {
  id: string;
  email: string;
  full_name: string | null;
  app_role?: 'admin' | 'leader' | 'slt' | 'user';
  manager_id?: string | null;
  manager_email?: string | null;
}

/**
 * Get authenticated user from cookies - for use in Server Components
 * This version reads cookies directly without needing a NextRequest
 */
export async function getAuthenticatedUserFromCookies(): Promise<ITPUser | null> {
  if (AUTH_DISABLED) {
    // In dev mode, try to get user from database using mock user ID
    const { data: profile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id, email, full_name, app_role, manager_id, manager_email')
      .eq('id', MOCK_USER.id)
      .single();

    if (profile) {
      return profile as ITPUser;
    }

    return {
      id: MOCK_USER.id,
      email: MOCK_USER.email,
      full_name: MOCK_USER.full_name,
      app_role: MOCK_USER.app_role as 'admin' | 'leader' | 'slt' | 'user',
      manager_id: null,
      manager_email: null,
    };
  }

  const cookieStore = await cookies();

  // Try new auth cookie first
  const userCookie = cookieStore.get(USER_COOKIE)?.value;
  if (userCookie) {
    try {
      const decoded = decodeURIComponent(userCookie);
      const user = JSON.parse(decoded);

      // Get full profile from database
      const { data: profile } = await getSupabaseAdmin()
        .from('user_profiles')
        .select('id, email, full_name, app_role, manager_id, manager_email')
        .eq('id', user.id)
        .single();

      if (profile) {
        return profile as ITPUser;
      }

      // Fallback to cookie data
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        app_role: user.app_role,
        manager_id: null,
        manager_email: null,
      };
    } catch {
      // Try without decode
      try {
        const user = JSON.parse(userCookie);
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          app_role: user.app_role,
          manager_id: null,
          manager_email: null,
        };
      } catch {
        console.error('[Auth] Failed to parse user cookie');
      }
    }
  }

  // Try legacy cookie
  const legacyUserId = cookieStore.get('itp_user_id')?.value;
  if (legacyUserId) {
    const { data: profile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id, email, full_name, app_role, manager_id, manager_email')
      .eq('id', legacyUserId)
      .single();

    if (profile) {
      return profile as ITPUser;
    }
  }

  return null;
}

/**
 * Check if user can view an assessment
 */
export function canViewAssessment(
  currentUser: ITPUser,
  targetEmployeeId: string,
  targetManagerId: string | null,
  targetManagerEmail: string | null
): boolean {
  // User can view their own
  if (currentUser.id === targetEmployeeId) return true;

  // Admin can view all
  if (currentUser.app_role === 'admin') return true;

  // Manager can view direct reports
  if (targetManagerId === currentUser.id || targetManagerEmail === currentUser.email) {
    return true;
  }

  return false;
}

/**
 * Check if user can edit an assessment
 */
export function canEditAssessment(currentUser: ITPUser, targetEmployeeId: string): boolean {
  // User can edit their own
  if (currentUser.id === targetEmployeeId) return true;

  // Admin can edit all
  if (currentUser.app_role === 'admin') return true;

  return false;
}
