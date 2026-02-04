/**
 * Authentication Wrapper
 */

import { NextRequest } from 'next/server';
import {
  AUTH_DISABLED,
  MOCK_USER,
  getAuthenticatedUser as getAuthUser,
  validateSession,
} from './auth';
import {
  syncUserProfile,
  getUserProfileByEmail,
  updateLastLogin,
  toSessionUser,
} from './auth-supabase';
import type { SessionUser, UserProfile } from './schema';

// Decode user data from base64-encoded header (handles non-ASCII characters like accented names)
function decodeUserDataFromHeader(encoded: string): Record<string, any> | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    // Fallback: try parsing as raw JSON for backwards compatibility
    try {
      return JSON.parse(encoded);
    } catch {
      return null;
    }
  }
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: SessionUser; profile: UserProfile } | null> {
  const userDataHeader = request.headers.get('x-user-data');
  if (userDataHeader) {
    try {
      const sessionUser = decodeUserDataFromHeader(userDataHeader) as SessionUser;
      if (!sessionUser) throw new Error('Failed to decode user data');
      const profile = await getUserProfileByEmail(sessionUser.email);
      if (profile) {
        return { user: toSessionUser(profile), profile };
      }
      return {
        user: sessionUser,
        profile: {
          ...sessionUser,
          auth0_id: sessionUser.auth0_id || null,
          given_name: sessionUser.given_name || sessionUser.full_name?.split(' ')[0] || '',
          family_name: sessionUser.family_name || sessionUser.full_name?.split(' ').slice(1).join(' ') || '',
          picture: sessionUser.picture || null,
          avatar_url: null,
          global_role: sessionUser.global_role || sessionUser.app_role,
          capabilities: sessionUser.capabilities || null,
          local_permissions: null,
          job_title: sessionUser.title || '',
          phone: null,
          location: null,
          manager_id: null,
          manager_email: null,
          employee_number: null,
          cost_center: null,
          external_id: null,
          has_logged_in: true,
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          sync_method: 'session',
          last_sync: null,
          is_active: true,
          is_hidden: null,
          scim_active: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          last_updated_by: null,
          idx: 0,
          app_access: sessionUser.app_access !== undefined ? sessionUser.app_access : true,
        } as UserProfile,
      };
    } catch (error) {
      console.error('[auth-wrapper] Failed to parse session user:', error);
    }
  }

  if (AUTH_DISABLED) {
    const mockProfile = await getUserProfileByEmail(MOCK_USER.email);
    if (mockProfile) {
      return { user: toSessionUser(mockProfile), profile: mockProfile };
    }
    return {
      user: MOCK_USER,
      profile: {
        ...MOCK_USER,
        auth0_id: null,
        given_name: 'Thomas',
        family_name: 'Palmer',
        picture: null,
        avatar_url: null,
        global_role: 'admin',
        capabilities: null,
        local_permissions: null,
        job_title: 'Software Engineer',
        phone: null,
        location: null,
        manager_id: null,
        manager_email: null,
        employee_number: null,
        cost_center: null,
        external_id: null,
        has_logged_in: true,
        first_login_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        sync_method: 'mock',
        last_sync: null,
        is_active: true,
        is_hidden: null,
        scim_active: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        last_updated_by: null,
        idx: 0,
        app_access: true,
      } as UserProfile,
    };
  }

  const user = await getAuthUser(request);
  if (!user) return null;

  const profile = await syncUserProfile(user);
  if (!profile) return null;

  return { user: toSessionUser(profile), profile };
}

export async function validateAndSyncSession(
  sessionToken: string
): Promise<{ user: SessionUser; profile: UserProfile } | null> {
  if (AUTH_DISABLED) {
    return getAuthenticatedUser({} as NextRequest);
  }

  const user = await validateSession(sessionToken);
  if (!user) return null;

  const profile = await syncUserProfile(user);
  if (!profile) return null;

  await updateLastLogin(user.email);
  return { user: toSessionUser(profile), profile };
}

export async function getUserProfile(
  email: string
): Promise<{ user: SessionUser; profile: UserProfile } | null> {
  const profile = await getUserProfileByEmail(email);
  if (!profile) return null;
  return { user: toSessionUser(profile), profile };
}

export async function refreshUserProfile(email: string): Promise<UserProfile | null> {
  return getUserProfileByEmail(email);
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  const authData = await getAuthenticatedUser(request);
  return authData?.user.app_role === 'admin';
}

export async function isLeaderOrAdmin(request: NextRequest): Promise<boolean> {
  const authData = await getAuthenticatedUser(request);
  const role = authData?.user.app_role;
  return role === 'admin' || role === 'leader';
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: SessionUser; profile: UserProfile }> {
  const authData = await getAuthenticatedUser(request);
  if (!authData) throw new Error('Unauthorized');
  return authData;
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ user: SessionUser; profile: UserProfile }> {
  const authData = await requireAuth(request);
  if (authData.user.app_role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return authData;
}

export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ user: SessionUser; profile: UserProfile }> {
  const authData = await requireAuth(request);
  if (authData.user.app_role === 'admin') return authData;

  let hasPermission = false;
  if (permission === 'admin') {
    hasPermission = authData.user.app_role === 'admin';
  } else if (permission === 'write') {
    hasPermission = ['admin', 'slt', 'leader'].includes(authData.user.app_role);
  } else if (permission === 'read') {
    hasPermission = true;
  }

  if (!hasPermission) {
    throw new Error(`Forbidden: ${permission} permission required`);
  }
  return authData;
}

export type AuthData = { user: SessionUser; profile: UserProfile };
export type SessionData = AuthData & { sessionToken: string };
